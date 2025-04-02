if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = true;
    let wakeWordDetected = true;
    let isListening = false;
    let lastCommandTime = 0;
    let isAuthenticated = false;

    // OAuth Configuration - MUST match your Google Cloud Console settings
    const OAUTH_CONFIG = {
        clientId: '629991621617-u5vp7bh2dm1vd36u2laeppdjt74uc56h.apps.googleusercontent.com',
        redirectUri: 'https://mail.google.com', // Must match exactly what's in Google Cloud Console
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
    };

    // Floating Popup UI
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-size: 16px;
        border-radius: 10px;
        display: none;
        z-index: 9999;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.3);
        transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(popup);

    // Add microphone indicator
    const micIndicator = document.createElement("div");
    micIndicator.id = "mic-indicator";
    micIndicator.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        width: 20px;
        height: 20px;
        background: red;
        border-radius: 50%;
        z-index: 10000;
        transition: background 0.3s;
    `;
    document.body.appendChild(micIndicator);

    // Add command history display
    const commandHistory = document.createElement("div");
    commandHistory.id = "command-history";
    commandHistory.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 250px;
        max-height: 200px;
        overflow-y: auto;
        padding: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 14px;
        border-radius: 10px;
        display: none;
        z-index: 9998;
    `;
    document.body.appendChild(commandHistory);

    function showPopup(message, status) {
        popup.innerHTML = `<b>Status:</b> ${status} <br> <b>You said:</b> ${message}`;
        popup.style.display = "block";
        popup.style.opacity = "1";

        clearTimeout(popup.hideTimeout);
        popup.hideTimeout = setTimeout(() => {
            popup.style.opacity = "0";
            setTimeout(() => {
                popup.style.display = "none";
            }, 500);
        }, 2500);
    }

    function addToHistory(command, response) {
        const entry = document.createElement("div");
        entry.innerHTML = `<b>You:</b> ${command}<br><b>System:</b> ${response}`;
        entry.style.marginBottom = "10px";
        entry.style.borderBottom = "1px solid #444";
        entry.style.paddingBottom = "10px";
        commandHistory.insertBefore(entry, commandHistory.firstChild);
        
        if (commandHistory.children.length > 5) {
            commandHistory.removeChild(commandHistory.lastChild);
        }
        
        commandHistory.style.display = "block";
    }

    function speak(text) {
        try {
            if (!('speechSynthesis' in window)) {
                console.error("Speech synthesis not supported");
                return;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.cancel();
            utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event.error);
            };
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Error in speak function:", error);
        }
    }

    function checkAuthStatus() {
        const accessToken = localStorage.getItem("access_token");
        const expiresAt = localStorage.getItem("expires_at");
        isAuthenticated = !!accessToken && new Date().getTime() < expiresAt;
        return isAuthenticated;
    }

    async function refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;
        
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: OAUTH_CONFIG.clientId,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });
            
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            const expiresAt = new Date().getTime() + (data.expires_in * 1000);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('expires_at', expiresAt);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    function initiateOAuthLogin() {
        // Generate a secure state token
        const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
        sessionStorage.setItem('oauth_state', state);
        
        const params = new URLSearchParams({
            client_id: OAUTH_CONFIG.clientId,
            redirect_uri: OAUTH_CONFIG.redirectUri,
            response_type: 'code',
            scope: OAUTH_CONFIG.scope,
            state: state,
            access_type: 'offline',
            prompt: 'consent'
        });

        window.location.href = `${OAUTH_CONFIG.authUrl}?${params.toString()}`;
    }

    async function handleOAuthResponse() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            console.error('OAuth error:', error);
            speak("Login failed. Please try again.");
            return;
        }

        // Verify state
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
            console.error('State mismatch');
            speak("Login failed. Security error.");
            return;
        }
        sessionStorage.removeItem('oauth_state');

        if (code) {
            try {
                // Exchange authorization code for tokens
                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        code: code,
                        client_id: OAUTH_CONFIG.clientId,
                        redirect_uri: OAUTH_CONFIG.redirectUri,
                        grant_type: 'authorization_code'
                    })
                });
                
                const data = await response.json();
                
                if (data.error) throw new Error(data.error);
                
                const expiresAt = new Date().getTime() + (data.expires_in * 1000);
                localStorage.setItem('access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
                localStorage.setItem('expires_at', expiresAt);
                isAuthenticated = true;
                
                // Redirect to Gmail after auth
                const redirectUrl = sessionStorage.getItem('postAuthRedirect') || 'https://mail.google.com';
                window.location.href = redirectUrl;
            } catch (error) {
                console.error('Token exchange failed:', error);
                speak("Login failed. Please try again.");
            }
        }
    }

    // Check for OAuth response when page loads
    if (window.location.hash.includes('access_token')) {
        handleOAuthResponse();
    }

    async function fetchEmails() {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) return;

        try {
            showPopup("Fetching your emails...", "PROCESSING");
            
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=3&q=is:unread`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);
            if (!data.messages || data.messages.length === 0) {
                speak("You have no new emails.");
                showPopup("No new emails", "INFO");
                return;
            }

            // Process the first email
            const email = data.messages[0];
            const emailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const emailData = await emailResponse.json();
            const headers = emailData.payload.headers;
            
            const fromHeader = headers.find(h => h.name.toLowerCase() === "from");
            const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject");
            
            const from = fromHeader ? fromHeader.value.split('<')[0].trim() : "Unknown sender";
            const subject = subjectHeader ? subjectHeader.value : "No subject";
            
            const message = `You have new email from ${from}. Subject: ${subject}`;
            speak(message);
            showPopup(message, "EMAIL");
            addToHistory("Read emails", `Found email from ${from} about ${subject}`);
            
        } catch (error) {
            console.error("Error fetching emails:", error);
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                speak("Your session expired. Please log in again.");
                showPopup("Session expired. Please login again.", "ERROR");
            } else {
                speak("Sorry, I couldn't fetch your emails.");
                showPopup("Error fetching emails", "ERROR");
            }
        }
    }

    async function sendEmail(to, subject, body) {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }
        
        const accessToken = localStorage.getItem("access_token");
        const rawEmail = [
            `To: ${to}`,
            `Subject: ${subject}`,
            "",
            body
        ].join("\n");
        
        const base64Email = btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_');
        
        try {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: base64Email
                })
            });
            
            const data = await response.json();
            speak("Email sent successfully");
            addToHistory(`Send email to ${to}`, "Email sent successfully");
            return data;
        } catch (error) {
            speak("Failed to send email");
            console.error(error);
            addToHistory(`Send email to ${to}`, "Failed to send email");
            throw error;
        }
    }

    async function archiveEmail(messageId) {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }
        
        const accessToken = localStorage.getItem("access_token");
        
        try {
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    removeLabelIds: ['INBOX']
                })
            });
            
            speak("Email archived");
            addToHistory(`Archive email ${messageId}`, "Email archived");
        } catch (error) {
            speak("Failed to archive email");
            console.error(error);
            addToHistory(`Archive email ${messageId}`, "Failed to archive");
            throw error;
        }
    }

    async function markAsRead(messageId, read = true) {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }
        
        const accessToken = localStorage.getItem("access_token");
        const action = read ? "read" : "unread";
        
        try {
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    removeLabelIds: read ? ['UNREAD'] : [],
                    addLabelIds: read ? [] : ['UNREAD']
                })
            });
            
            speak(`Email marked as ${action}`);
            addToHistory(`Mark email as ${action}`, "Status updated");
        } catch (error) {
            speak(`Failed to mark email as ${action}`);
            console.error(error);
            addToHistory(`Mark email as ${action}`, "Failed to update status");
            throw error;
        }
    }

    async function deleteEmail(messageId) {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }
        
        const accessToken = localStorage.getItem("access_token");
        
        try {
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            speak("Email moved to trash");
            addToHistory(`Delete email ${messageId}`, "Email deleted");
        } catch (error) {
            speak("Failed to delete email");
            console.error(error);
            addToHistory(`Delete email ${messageId}`, "Failed to delete");
            throw error;
        }
    }

    async function readFullEmail(messageId) {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }
        
        const accessToken = localStorage.getItem("access_token");
        
        try {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const emailData = await response.json();
            
            // Extract headers
            const headers = emailData.payload.headers;
            const fromHeader = headers.find(h => h.name.toLowerCase() === "from");
            const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject");
            const dateHeader = headers.find(h => h.name.toLowerCase() === "date");
            
            const from = fromHeader ? fromHeader.value.split('<')[0].trim() : "Unknown sender";
            const subject = subjectHeader ? subjectHeader.value : "No subject";
            const date = dateHeader ? new Date(dateHeader.value).toLocaleString() : "Unknown date";
            
            // Extract body
            let body = "";
            if (emailData.payload.parts) {
                const textPart = emailData.payload.parts.find(part => part.mimeType === "text/plain");
                if (textPart) {
                    body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }
            } else if (emailData.payload.body.data) {
                body = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            
            // Clean up body text
            body = body.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Read the email
            const message = `Email from ${from}, received ${date}. Subject: ${subject}. ${body.substring(0, 500)}`;
            speak(message);
            showPopup(`Reading email: ${subject}`, "EMAIL");
            addToHistory(`Read email ${messageId}`, `From ${from} about ${subject}`);
            
        } catch (error) {
            console.error("Error reading email:", error);
            speak("Sorry, I couldn't read that email.");
            showPopup("Error reading email", "ERROR");
            addToHistory(`Read email ${messageId}`, "Failed to read email");
        }
    }

    function parseCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        const commandPatterns = [
            {
                regex: /^(?:reply|respond)(?: to)? (.+?)(?: email)?$/i,
                action: 'reply',
                extract: (match) => ({ target: match[1] })
            },
            {
                regex: /^send (?:an? )?email to (.+?)(?: with subject (.+?))?(?: saying (.+))?$/i,
                action: 'send',
                extract: (match) => ({
                    to: match[1],
                    subject: match[2] || "No subject",
                    body: match[3] || "No content"
                })
            },
            {
                regex: /^delete (?:the )?(.+?) email(?: in (.+?))?$/i,
                action: 'delete',
                extract: (match) => ({
                    position: match[1],
                    folder: match[2] || "inbox"
                })
            },
            {
                regex: /^mark (?:all )?(.+?) emails? (?:as )?(read|unread)(?: in (.+?))?$/i,
                action: 'markStatus',
                extract: (match) => ({
                    filter: match[1],
                    status: match[2],
                    folder: match[3] || "inbox"
                })
            },
            {
                regex: /^read (?:the )?(.+?) email(?: in (.+?))?$/i,
                action: 'readEmail',
                extract: (match) => ({
                    position: match[1],
                    folder: match[2] || "inbox"
                })
            }
        ];

        // Try to match the transcript against each pattern
        for (const pattern of commandPatterns) {
            const match = lowerTranscript.match(pattern.regex);
            if (match) {
                return {
                    action: pattern.action,
                    ...pattern.extract(match)
                };
            }
        }

        return null;
    }

    async function executeEnhancedCommand(parsedCommand) {
        switch (parsedCommand.action) {
            case 'reply':
                await handleReplyCommand(parsedCommand.target);
                break;
            case 'send':
                await handleSendCommand(parsedCommand.to, parsedCommand.subject, parsedCommand.body);
                break;
            case 'delete':
                await handleDeleteCommand(parsedCommand.position, parsedCommand.folder);
                break;
            case 'markStatus':
                await handleMarkStatusCommand(parsedCommand.filter, parsedCommand.status, parsedCommand.folder);
                break;
            case 'readEmail':
                await handleReadEmailCommand(parsedCommand.position, parsedCommand.folder);
                break;
            default:
                speak("I didn't understand that command. Please try again.");
        }
    }

    async function handleReplyCommand(target) {
        if (target.includes('@')) {
            const messageId = await findMessageIdBySender(target);
            if (messageId) {
                window.open(`https://mail.google.com/mail/u/0/#inbox?compose=new&messageId=${messageId}`, "_self");
                speak(`Opening reply to email from ${target}`);
                addToHistory(`Reply to email from ${target}`, "Opened reply interface");
            } else {
                speak(`Could not find an email from ${target}`);
                addToHistory(`Reply to email from ${target}`, "No email found");
            }
        } else {
            const messageId = await findMessageIdByPosition(target);
            if (messageId) {
                window.open(`https://mail.google.com/mail/u/0/#inbox?compose=new&messageId=${messageId}`, "_self");
                speak(`Opening reply to the ${target} email`);
                addToHistory(`Reply to ${target} email`, "Opened reply interface");
            } else {
                speak(`Could not find the ${target} email`);
                addToHistory(`Reply to ${target} email`, "No email found");
            }
        }
    }

    async function handleSendCommand(to, subject, body) {
        if (!to.includes('@')) {
            speak("That doesn't look like a valid email address. Please try again.");
            addToHistory(`Send email to ${to}`, "Invalid email address");
            return;
        }

        const composeUrl = `https://mail.google.com/mail/u/0/#inbox?compose=new&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(composeUrl, "_self");
        speak(`Opening email to ${to} with subject "${subject}"`);
        addToHistory(`Send email to ${to}`, "Opened compose window");
    }

    async function handleDeleteCommand(position, folder) {
        const messageId = await findMessageIdByPositionAndFolder(position, folder);
        if (messageId) {
            await deleteEmail(messageId);
            speak(`Deleted the ${position} email in ${folder}`);
            addToHistory(`Delete ${position} email in ${folder}`, "Email deleted");
        } else {
            speak(`Could not find the ${position} email in ${folder}`);
            addToHistory(`Delete ${position} email in ${folder}`, "No email found");
        }
    }

    async function handleMarkStatusCommand(filter, status, folder) {
        if (filter === 'all') {
            await markAllEmailsInFolder(folder, status === 'read');
            speak(`Marked all emails in ${folder} as ${status}`);
            addToHistory(`Mark all emails in ${folder} as ${status}`, "Status updated");
        } else if (filter.includes('sent on')) {
            const day = filter.replace('sent on', '').trim();
            await markEmailsByDay(folder, day, status === 'read');
            speak(`Marked emails ${filter} in ${folder} as ${status}`);
            addToHistory(`Mark emails ${filter} in ${folder} as ${status}`, "Status updated");
        } else {
            const messageId = await findMessageIdByPositionAndFolder(filter, folder);
            if (messageId) {
                await markAsRead(messageId, status === 'read');
                speak(`Marked the ${filter} email in ${folder} as ${status}`);
                addToHistory(`Mark ${filter} email in ${folder} as ${status}`, "Status updated");
            } else {
                speak(`Could not find the ${filter} email in ${folder}`);
                addToHistory(`Mark ${filter} email in ${folder} as ${status}`, "No email found");
            }
        }
    }

    async function handleReadEmailCommand(position, folder) {
        const messageId = await findMessageIdByPositionAndFolder(position, folder);
        if (messageId) {
            await readFullEmail(messageId);
            addToHistory(`Read ${position} email in ${folder}`, "Email read aloud");
        } else {
            speak(`Could not find the ${position} email in ${folder}`);
            addToHistory(`Read ${position} email in ${folder}`, "No email found");
        }
    }

    async function findMessageIdByPositionAndFolder(position, folder = 'inbox') {
        const accessToken = localStorage.getItem("access_token");
        const folderMap = {
            'inbox': 'INBOX',
            'spam': 'SPAM',
            'trash': 'TRASH',
            'sent': 'SENT',
            'drafts': 'DRAFTS'
        };
        const labelId = folderMap[folder.toLowerCase()] || 'INBOX';
        
        try {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=${labelId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const data = await response.json();
            if (!data.messages || data.messages.length === 0) return null;
            
            let index = 0;
            if (position.includes('first')) index = 0;
            else if (position.includes('last')) index = data.messages.length - 1;
            else if (position.includes('second')) index = 1;
            else if (position.includes('third')) index = 2;
            
            return data.messages[index].id;
        } catch (error) {
            console.error('Error finding message:', error);
            return null;
        }
    }

    async function findMessageIdBySender(email) {
        const accessToken = localStorage.getItem("access_token");
        
        try {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=from:${encodeURIComponent(email)}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const data = await response.json();
            return data.messages?.[0]?.id || null;
        } catch (error) {
            console.error('Error finding message by sender:', error);
            return null;
        }
    }

    async function markAllEmailsInFolder(folder, read = true) {
        const accessToken = localStorage.getItem("access_token");
        const labelMap = {
            'inbox': 'INBOX',
            'spam': 'SPAM',
            'trash': 'TRASH',
            'sent': 'SENT',
            'drafts': 'DRAFTS'
        };
        const labelId = labelMap[folder.toLowerCase()] || 'INBOX';
        
        try {
            const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const listData = await listResponse.json();
            if (!listData.messages || listData.messages.length === 0) return;
            
            const messageIds = listData.messages.map(msg => msg.id);
            
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: messageIds,
                    removeLabelIds: read ? ['UNREAD'] : [],
                    addLabelIds: read ? [] : ['UNREAD']
                })
            });
            
        } catch (error) {
            console.error('Error marking all emails:', error);
            throw error;
        }
    }

    async function markEmailsByDay(folder, day, read = true) {
        const accessToken = localStorage.getItem("access_token");
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(day.toLowerCase());
        
        if (dayIndex === -1) {
            throw new Error('Invalid day specified');
        }
        
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - ((today.getDay() - dayIndex + 7) % 7));
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);
        
        const dateStr = formatDateForQuery(targetDate);
        const nextDateStr = formatDateForQuery(nextDay);
        
        try {
            const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${dateStr} before:${nextDateStr}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const listData = await listResponse.json();
            if (!listData.messages || listData.messages.length === 0) return;
            
            const messageIds = listData.messages.map(msg => msg.id);
            
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: messageIds,
                    removeLabelIds: read ? ['UNREAD'] : [],
                    addLabelIds: read ? [] : ['UNREAD']
                })
            });
            
        } catch (error) {
            console.error('Error marking emails by day:', error);
            throw error;
        }
    }

    function formatDateForQuery(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    function executeCommand(transcript) {
        let lowerTranscript = transcript.toLowerCase().trim();
        let now = Date.now();
        
        // Skip if command was recently executed
        if (now - lastCommandTime < 3000) return;
        lastCommandTime = now;

        // First try enhanced command parsing
        const parsedCommand = parseCommand(lowerTranscript);
        if (parsedCommand) {
            executeEnhancedCommand(parsedCommand);
            return;
        }

        // Fall back to simple commands
        const simpleCommands = {
            "compose": ["compose", "new email", "write email"],
            "inbox": ["inbox", "open inbox", "check inbox"],
            "sent": ["sent mail", "sent", "send", "sent messages"],
            "drafts": ["drafts", "saved emails"],
            "starred": ["starred", "important emails"],
            "snoozed": ["snoozed", "snooze emails"],
            "spam": ["spam", "junk mail"],
            "trash": ["trash", "deleted emails"],
            "all mail": ["all mail", "all messages"],
            "important": ["important", "priority emails"],
            "readEmails": ["read my emails", "read my email", "read latest emails", "check my emails", "show unread emails"],
            "login": ["login", "sign in", "authenticate"]
        };

        const urls = {
            "compose": "https://mail.google.com/mail/u/0/#inbox?compose=new",
            "inbox": "https://mail.google.com/mail/u/0/#inbox",
            "sent": "https://mail.google.com/mail/u/0/#sent",
            "drafts": "https://mail.google.com/mail/u/0/#drafts",
            "starred": "https://mail.google.com/mail/u/0/#starred",
            "snoozed": "https://mail.google.com/mail/u/0/#snoozed",
            "spam": "https://mail.google.com/mail/u/0/#spam",
            "trash": "https://mail.google.com/mail/u/0/#trash",
            "all mail": "https://mail.google.com/mail/u/0/#all",
            "important": "https://mail.google.com/mail/u/0/#important"
        };

        let matchedCommand = Object.keys(simpleCommands).find(command =>
            simpleCommands[command].some(phrase => lowerTranscript.includes(phrase))
        );

        if (matchedCommand) {
            if (matchedCommand === "login") {
                showPopup("Redirecting to login...", "PROCESSING");
                speak("Redirecting to login page");
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                initiateOAuthLogin();
                addToHistory("Login", "Redirecting to login page");
                return;
            }

            if (matchedCommand === "readEmails") {
                if (!checkAuthStatus()) {
                    speak("Please log in first by saying 'login'");
                    addToHistory("Read emails", "Not authenticated");
                    return;
                }
                fetchEmails();
                addToHistory("Read emails", "Fetching emails");
                return;
            }

            showPopup(`Opening ${matchedCommand}...`, "PROCESSING");
            speak(`Opening ${matchedCommand}`);
            window.open(urls[matchedCommand], "_self");
            addToHistory(`Open ${matchedCommand}`, "Navigating to section");
            return;
        }

        let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
        let randomResponse = responses[Math.floor(Math.random() * responses.length)];
        showPopup(randomResponse, "ERROR");
        speak(randomResponse);
        addToHistory(transcript, "Command not recognized");
    }

    // Start listening immediately when the page loads
    recognition.start();
    
    recognition.onstart = () => {
        isListening = true;
        micIndicator.style.background = "green";
        showPopup("Microphone activated - Listening...", "ON");
        speak("Ready for your commands");
    };

    recognition.onresult = (event) => {
        let result = event.results[event.results.length - 1][0];
        let transcript = result.transcript.trim().toLowerCase();
        let confidence = result.confidence;

        if (confidence < 0.7) return;

        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
        let sleepCommands = ["sleep email", "stop email", "turn off email"];

        if (wakeWords.some(word => transcript.includes(word))) {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");
            speak("Voice control activated. How can I assist?");
            addToHistory("Wake word detected", "Voice control activated");
            return;
        }

        if (sleepCommands.some(word => transcript.includes(word))) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speak("Voice control deactivated. Say 'Hey email' to reactivate.");
            addToHistory("Sleep command", "Voice control deactivated");
            return;
        }

        if (isActive) {
            executeCommand(transcript);
        }
    };

    recognition.onend = () => {
        isListening = false;
        micIndicator.style.background = "red";
        if (wakeWordDetected || !isActive) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    // Check auth status on page load
    checkAuthStatus();
}