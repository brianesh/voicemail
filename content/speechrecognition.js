// emailrecognition.js - Complete Voice-Controlled Gmail Assistant

// Check for speech recognition support
if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
    throw new Error("This browser doesn't support speech recognition. Please use Chrome or Edge.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // ================= CONFIGURATION ================= //
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // ================= STATE MANAGEMENT ================= //
    const state = {
        isActive: false,
        isListening: false,
        wakeWordDetected: false,
        lastCommandTime: 0,
        isAuthenticated: false,
        speechQueue: [],
        isSpeaking: false,
        apiCallTimestamps: [],
        isOnline: navigator.onLine,
        retryAttempts: 0,
        MAX_RETRIES: 3,
        API_RATE_LIMIT: 5,
        API_TIMEOUT: 10000,
        currentEmail: null,
        emailContext: null
    };

    // ================= OAUTH CONFIG ================= //
    const OAUTH_CONFIG = {
        clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
        authServer: 'http://localhost:8080',
        scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send'
        ],
        redirectUri: 'http://localhost:8080/callback'
    };

    // ================= UI ELEMENTS ================= //
    const ui = {
        popup: createElement("div", {
            id: "voice-assistant-popup",
            style: `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 10px;
                z-index: 9999;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                display: none;
                transition: all 0.3s ease;
            `
        }),
        micIndicator: createElement("div", {
            id: "mic-indicator",
            style: `
                position: fixed;
                bottom: 70px;
                right: 30px;
                width: 20px;
                height: 20px;
                background: red;
                border-radius: 50%;
                z-index: 10000;
                transition: background 0.3s;
            `
        }),
        commandHistory: createElement("div", {
            id: "command-history",
            style: `
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 300px;
                max-height: 200px;
                overflow-y: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 10px;
                z-index: 9998;
                display: none;
            `
        }),
        authButton: createElement("button", {
            id: "auth-button",
            textContent: "Sign In with Google",
            style: `
                position: fixed;
                bottom: 150px;
                right: 20px;
                padding: 10px 15px;
                background: #4285F4;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                z-index: 10000;
            `,
            onclick: () => initiateOAuthLogin()
        })
    };

    // Append UI elements to DOM
    Object.values(ui).forEach(element => document.body.appendChild(element));

    // ================= CORE FUNCTIONS ================= //

    function createElement(tag, attributes) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style') {
                Object.assign(element.style, value);
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'onclick') {
                element.onclick = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        return element;
    }

    function showPopup(message, status = "INFO") {
        const statusColors = {
            "INFO": "#4285F4",
            "SUCCESS": "#0F9D58",
            "ERROR": "#DB4437",
            "WARNING": "#F4B400",
            "ACTIVE": "#0F9D58",
            "INACTIVE": "#DB4437"
        };

        ui.popup.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; 
                    background: ${statusColors[status] || "#4285F4"}; margin-right: 8px;"></div>
                <strong>${status}</strong>
            </div>
            <div>${message}</div>
        `;
        ui.popup.style.display = "block";
        
        clearTimeout(ui.popup.hideTimeout);
        ui.popup.hideTimeout = setTimeout(() => {
            ui.popup.style.opacity = "0";
            setTimeout(() => {
                ui.popup.style.display = "none";
                ui.popup.style.opacity = "1";
            }, 300);
        }, 3000);
    }

    function updateMicIndicator(isActive) {
        ui.micIndicator.style.background = isActive ? "#0F9D58" : "#DB4437";
        ui.micIndicator.style.transform = isActive ? "scale(1.2)" : "scale(1)";
    }

    function addToHistory(command, response) {
        const entry = document.createElement("div");
        entry.innerHTML = `
            <div style="color: #4285F4; margin-bottom: 4px;"><strong>You:</strong> ${command}</div>
            <div style="color: #0F9D58;"><strong>System:</strong> ${response}</div>
            <hr style="border-color: #333; margin: 8px 0;">
        `;
        ui.commandHistory.insertBefore(entry, ui.commandHistory.firstChild);
        
        if (ui.commandHistory.children.length > 5) {
            ui.commandHistory.removeChild(ui.commandHistory.lastChild);
        }
        
        ui.commandHistory.style.display = "block";
    }

    function speak(text) {
        if (!('speechSynthesis' in window)) {
            console.error("Speech synthesis not supported");
            return;
        }

        state.speechQueue.push(text);
        processSpeechQueue();
    }

    function processSpeechQueue() {
        if (state.speechQueue.length === 0 || state.isSpeaking) return;
        
        state.isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(state.speechQueue.shift());
        
        utterance.onend = () => {
            state.isSpeaking = false;
            if (state.speechQueue.length > 0) {
                processSpeechQueue();
            }
        };
        
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            state.isSpeaking = false;
            processSpeechQueue();
        };
        
        speechSynthesis.speak(utterance);
    }

    // ================= AUTHENTICATION ================= //

    async function checkAuthStatus() {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        if (hashParams.has('access_token')) {
            await handleOAuthResponse(hashParams);
            return true;
        }

        const accessToken = localStorage.getItem('access_token');
        const expiresAt = localStorage.getItem('expires_at');
        
        if (accessToken && expiresAt && new Date().getTime() < parseInt(expiresAt)) {
            state.isAuthenticated = true;
            ui.authButton.style.display = 'none';
            return true;
        }
        
        ui.authButton.style.display = 'block';
        return false;
    }

    async function handleOAuthResponse(hashParams) {
        const accessToken = hashParams.get('access_token');
        const expiresIn = parseInt(hashParams.get('expires_in') || 3600);
        const expiresAt = new Date().getTime() + (expiresIn * 1000);
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('expires_at', expiresAt.toString());
        state.isAuthenticated = true;
        ui.authButton.style.display = 'none';
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        showPopup("Successfully authenticated", "SUCCESS");
        speak("You're now logged in and can use voice commands.");
    }

    function initiateOAuthLogin() {
        const stateToken = Math.random().toString(36).substring(2);
        sessionStorage.setItem('oauth_state', stateToken);
        sessionStorage.setItem('post_auth_redirect', window.location.href);
        
        const authUrl = new URL(OAUTH_CONFIG.authServer + '/auth');
        authUrl.searchParams.append('client_id', OAUTH_CONFIG.clientId);
        authUrl.searchParams.append('redirect_uri', OAUTH_CONFIG.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', OAUTH_CONFIG.scopes.join(' '));
        authUrl.searchParams.append('state', stateToken);
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');
        
        window.location.href = authUrl.toString();
    }

    // ================= EMAIL OPERATIONS ================= //

    async function fetchEmails(maxResults = 3, label = 'INBOX', query = '') {
        try {
            const accessToken = await ensureValidToken();
            showPopup("Fetching your emails...", "PROCESSING");
            
            let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=${label}`;
            if (query) url += `&q=${encodeURIComponent(query)}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(await response.text());
            
            const data = await response.json();
            if (!data.messages || data.messages.length === 0) {
                speak("You have no matching emails.");
                showPopup("No emails found", "INFO");
                return [];
            }
            
            return data.messages;
        } catch (error) {
            handleApiError(error, "fetching emails");
            return [];
        }
    }

    async function getEmailDetails(messageId) {
        try {
            const accessToken = await ensureValidToken();
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            
            const emailData = await response.json();
            const headers = emailData.payload.headers;
            
            return {
                id: messageId,
                from: headers.find(h => h.name.toLowerCase() === "from")?.value || "Unknown",
                subject: headers.find(h => h.name.toLowerCase() === "subject")?.value || "No subject",
                date: headers.find(h => h.name.toLowerCase() === "date")?.value || "Unknown",
                snippet: emailData.snippet,
                body: extractEmailBody(emailData.payload)
            };
        } catch (error) {
            handleApiError(error, "fetching email details");
            return null;
        }
    }

    function extractEmailBody(payload) {
        if (payload.parts) {
            const textPart = payload.parts.find(part => part.mimeType === "text/plain");
            if (textPart && textPart.body.data) {
                return decodeBase64(textPart.body.data);
            }
            
            const htmlPart = payload.parts.find(part => part.mimeType === "text/html");
            if (htmlPart && htmlPart.body.data) {
                return decodeBase64(htmlPart.body.data);
            }
        }
        return payload.body?.data ? decodeBase64(payload.body.data) : "";
    }

    function decodeBase64(data) {
        try {
            return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
            console.error("Error decoding base64:", e);
            return "";
        }
    }

    async function sendEmail(to, subject, body) {
        try {
            const accessToken = await ensureValidToken();
            
            const emailLines = [
                `To: ${to}`,
                `Subject: ${subject}`,
                "",
                body
            ].join("\n");
            
            const base64Email = btoa(emailLines)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        raw: base64Email
                    })
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            
            const result = await response.json();
            speak("Email sent successfully");
            showPopup("Email sent successfully", "SUCCESS");
            return result;
        } catch (error) {
            handleApiError(error, "sending email");
            throw error;
        }
    }

    // ================= COMMAND PARSING ================= //

    function parseCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Check for wake words
        if (handleWakeWords(lowerTranscript)) return null;
        
        // Process email addresses in transcript
        const processedTranscript = processTranscript(lowerTranscript);
        
        // Command patterns
        const commandPatterns = [
            {
                regex: /^(?:read|show|check)\s+(?:my\s+)?(?:emails?|messages?)(?:\s+in\s+(\w+))?(?:\s+from\s+(.+))?$/i,
                action: 'readEmails',
                extract: (match) => ({
                    label: match[1] || 'inbox',
                    query: match[2] ? `from:${match[2]}` : ''
                })
            },
            {
                regex: /^(?:compose|create|write)\s+(?:an?\s+)?(?:email|message)(?:\s+to\s+(.+?))?(?:\s+about\s+(.+?))?(?:\s+saying\s+(.+))?$/i,
                action: 'composeEmail',
                extract: (match) => ({
                    to: match[1],
                    subject: match[2] || '',
                    body: match[3] || ''
                })
            },
            {
                regex: /^(?:reply|respond)\s+(?:to\s+)?(?:this\s+)?(?:email|message)(?:\s+saying\s+(.+))?$/i,
                action: 'replyEmail',
                extract: (match) => ({
                    body: match[1] || ''
                })
            },
            {
                regex: /^(?:search|find)\s+(?:emails?|messages?)\s+(?:about|with)\s+(.+)/i,
                action: 'searchEmails',
                extract: (match) => ({
                    query: match[1]
                })
            },
            {
                regex: /^(?:mark\s+as\s+)?(read|unread)\s+(?:this\s+)?(?:email|message)$/i,
                action: 'markAsRead',
                extract: (match) => ({
                    read: match[1] === 'read'
                })
            },
            {
                regex: /^(?:delete|remove)\s+(?:this\s+)?(?:email|message)$/i,
                action: 'deleteEmail',
                extract: () => ({})
            },
            {
                regex: /^(?:open|go\s+to)\s+(inbox|sent|drafts|starred|spam|trash)$/i,
                action: 'navigateTo',
                extract: (match) => ({
                    location: match[1]
                })
            },
            {
                regex: /^(?:login|sign\s+in|authenticate)$/i,
                action: 'authenticate',
                extract: () => ({})
            }
        ];

        // Try to match command patterns
        for (const pattern of commandPatterns) {
            const match = processedTranscript.match(pattern.regex);
            if (match) {
                return {
                    action: pattern.action,
                    ...pattern.extract(match)
                };
            }
        }

        // Check for standalone email address
        const emailMatch = processedTranscript.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            return {
                action: 'composeEmail',
                to: emailMatch[1],
                subject: '',
                body: ''
            };
        }

        return null;
    }

    function processTranscript(transcript) {
        return transcript
            .replace(/\s(at|and)\s/gi, '@')
            .replace(/\s(dot|doht|dought)\s/gi, '.')
            .replace(/\s(gmail|male|mail)\s/gi, 'gmail')
            .replace(/\s(com|calm|come|con)\b/gi, 'com')
            .trim();
    }

    function handleWakeWords(transcript) {
        const wakeWords = ["hey email", "hi email", "hey emil", "hello email"];
        const sleepWords = ["sleep email", "stop listening", "deactivate"];
        
        if (wakeWords.some(word => transcript.includes(word))) {
            state.isActive = true;
            state.wakeWordDetected = true;
            showPopup("Voice control activated", "ACTIVE");
            speak("How can I help with your emails?");
            return true;
        }
        
        if (sleepWords.some(word => transcript.includes(word))) {
            state.isActive = false;
            state.wakeWordDetected = false;
            showPopup("Voice control deactivated", "INACTIVE");
            speak("Voice control turned off. Say 'Hey Email' to reactivate.");
            return true;
        }
        
        return false;
    }

    // ================= COMMAND IMPLEMENTATIONS ================= //

    async function handleReadEmails({ label = 'inbox', query = '' }) {
        const emails = await fetchEmails(3, label.toUpperCase(), query);
        if (emails.length === 0) return;
        
        const emailDetails = await Promise.all(
            emails.map(email => getEmailDetails(email.id))
        );
        
        state.currentEmail = emailDetails[0];
        
        let response = `You have ${emails.length} emails in your ${label}:`;
        emailDetails.forEach((email, index) => {
            response += `\n${index + 1}. From ${email.from}, subject: ${email.subject}`;
        });
        
        showPopup(`Found ${emails.length} emails`, "SUCCESS");
        speak(response);
        addToHistory(`Read emails from ${label}`, response);
    }

    async function handleComposeEmail({ to = '', subject = '', body = '' }) {
        if (!to && state.currentEmail) {
            to = extractEmailAddress(state.currentEmail.from);
        }
        
        if (!to) {
            speak("Who would you like to email?");
            return;
        }
        
        const composeUrl = `https://mail.google.com/mail/u/0/#inbox?compose=new&to=${encodeURIComponent(to)}`;
        if (subject) composeUrl += `&su=${encodeURIComponent(subject)}`;
        if (body) composeUrl += `&body=${encodeURIComponent(body)}`;
        
        window.open(composeUrl, "_self");
        showPopup(`Composing email to ${to}`, "PROCESSING");
        addToHistory(`Compose email to ${to}`, "Opened compose window");
    }

    async function handleReplyEmail({ body = '' }) {
        if (!state.currentEmail) {
            speak("No email selected to reply to");
            return;
        }
        
        const replyUrl = `https://mail.google.com/mail/u/0/#inbox?compose=new&messageId=${state.currentEmail.id}`;
        if (body) replyUrl += `&body=${encodeURIComponent(body)}`;
        
        window.open(replyUrl, "_self");
        showPopup(`Replying to email from ${state.currentEmail.from}`, "PROCESSING");
        addToHistory(`Reply to email`, "Opened reply window");
    }

    async function handleSearchEmails({ query }) {
        const emails = await fetchEmails(5, 'INBOX', query);
        if (emails.length === 0) return;
        
        const emailDetails = await Promise.all(
            emails.map(email => getEmailDetails(email.id))
        );
        
        state.currentEmail = emailDetails[0];
        
        let response = `Found ${emails.length} emails matching "${query}":`;
        emailDetails.forEach((email, index) => {
            response += `\n${index + 1}. From ${email.from}, subject: ${email.subject}`;
        });
        
        showPopup(`Found ${emails.length} matching emails`, "SUCCESS");
        speak(response);
        addToHistory(`Search for "${query}"`, response);
    }

    async function handleMarkAsRead({ read = true }) {
        if (!state.currentEmail) {
            speak("No email selected to mark");
            return;
        }
        
        try {
            const accessToken = await ensureValidToken();
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${state.currentEmail.id}/modify`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        removeLabelIds: read ? ['UNREAD'] : [],
                        addLabelIds: read ? [] : ['UNREAD']
                    })
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            
            const action = read ? "read" : "unread";
            speak(`Email marked as ${action}`);
            showPopup(`Email marked as ${action}`, "SUCCESS");
            addToHistory(`Mark email as ${action}`, "Status updated");
        } catch (error) {
            handleApiError(error, "marking email as read");
        }
    }

    async function handleDeleteEmail() {
        if (!state.currentEmail) {
            speak("No email selected to delete");
            return;
        }
        
        try {
            const accessToken = await ensureValidToken();
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${state.currentEmail.id}/trash`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            
            speak("Email moved to trash");
            showPopup("Email moved to trash", "SUCCESS");
            addToHistory("Delete email", "Email moved to trash");
            state.currentEmail = null;
        } catch (error) {
            handleApiError(error, "deleting email");
        }
    }

    async function handleNavigation({ location }) {
        const locations = {
            'inbox': 'https://mail.google.com/mail/u/0/#inbox',
            'sent': 'https://mail.google.com/mail/u/0/#sent',
            'drafts': 'https://mail.google.com/mail/u/0/#drafts',
            'starred': 'https://mail.google.com/mail/u/0/#starred',
            'spam': 'https://mail.google.com/mail/u/0/#spam',
            'trash': 'https://mail.google.com/mail/u/0/#trash'
        };
        
        if (locations[location]) {
            window.open(locations[location], "_self");
            showPopup(`Opening ${location}`, "PROCESSING");
            addToHistory(`Navigate to ${location}`, "Page changed");
        } else {
            speak("I don't know how to go there");
            showPopup("Unknown location", "ERROR");
        }
    }

    async function handleAuthentication() {
        initiateOAuthLogin();
    }

    // ================= UTILITY FUNCTIONS ================= //

    function extractEmailAddress(fullAddress) {
        const match = fullAddress.match(/<(.+?)>/);
        return match ? match[1] : fullAddress;
    }

    function handleApiError(error, context) {
        console.error(`Error ${context}:`, error);
        
        let errorMessage = "Something went wrong";
        if (error.message.includes("401") || error.message.includes("Invalid Credentials")) {
            errorMessage = "Please sign in again";
            state.isAuthenticated = false;
            localStorage.removeItem('access_token');
            localStorage.removeItem('expires_at');
            ui.authButton.style.display = 'block';
        } else if (error.message.includes("403") || error.message.includes("Quota")) {
            errorMessage = "API quota exceeded. Try again later.";
        } else if (!state.isOnline) {
            errorMessage = "No internet connection";
        }
        
        showPopup(errorMessage, "ERROR");
        speak(errorMessage);
    }

    async function ensureValidToken() {
        if (await checkAuthStatus()) {
            return localStorage.getItem('access_token');
        }
        
        showPopup("Please sign in to continue", "WARNING");
        speak("You need to sign in first");
        await handleAuthentication();
        throw new Error("Authentication required");
    }

    // ================= EVENT HANDLERS ================= //

    function handleRecognitionStart() {
        state.isListening = true;
        updateMicIndicator(true);
    }

    function handleRecognitionResult(event) {
        const result = event.results[event.results.length - 1][0];
        const transcript = result.transcript.trim();
        const confidence = result.confidence;

        if (confidence < 0.7) return;

        const processedTranscript = processTranscript(transcript);
        showPopup(processedTranscript, state.isActive ? "ON" : "OFF");

        if (!handleWakeWords(processedTranscript) && state.isActive) {
            executeCommand(processedTranscript);
        }
    }

    function handleRecognitionEnd() {
        state.isListening = false;
        updateMicIndicator(false);
        if (state.wakeWordDetected || !state.isActive) {
            setTimeout(() => recognition.start(), 1000);
        }
    }

    function handleRecognitionError(event) {
        console.error("Recognition error:", event.error);
        showPopup("Error: " + event.error, "ERROR");
        setTimeout(() => recognition.start(), 1000);
    }

    // ================= INITIALIZATION ================= //

    // Set up event listeners
    recognition.onstart = handleRecognitionStart;
    recognition.onresult = handleRecognitionResult;
    recognition.onend = handleRecognitionEnd;
    recognition.onerror = handleRecognitionError;

    // Network status listeners
    window.addEventListener('online', () => {
        state.isOnline = true;
        showPopup("Connection restored", "ONLINE");
        speak("Connection restored. Ready for commands.");
    });

    window.addEventListener('offline', () => {
        state.isOnline = false;
        showPopup("Connection lost", "OFFLINE");
        speak("I've lost internet connection. Please check your network.");
    });

    // Check auth status on load
    checkAuthStatus().then(authenticated => {
        if (authenticated) {
            showPopup("Ready for voice commands", "ACTIVE");
            speak("Ready for your commands. Say 'Hey Email' to start.");
        } else {
            showPopup("Sign in to use voice commands", "INFO");
        }
    });

    // Start listening
    recognition.start();
}