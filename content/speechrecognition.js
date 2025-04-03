if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    setTimeout(() => recognition.start(), 0);

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // State variables
    let isActive = true;
    let wakeWordDetected = true;
    let isListening = false;
    let lastCommandTime = 0;
    let isAuthenticated = false;
    let speechQueue = [];
    let isSpeaking = false;
    let apiCallTimestamps = [];
    let isOnline = navigator.onLine;
    let retryAttempts = 0;
    const MAX_RETRIES = 3;
    const API_RATE_LIMIT = 10;
    const API_TIMEOUT = 15000;

    // Enhanced OAuth Configuration
    const OAUTH_CONFIG = {
        clientId: '629991621617-u5vp7bh2dm1vd36u2laeppdjt74uc56h.apps.googleusercontent.com',
        redirectUri: chrome.identity.getRedirectURL() || window.location.origin + window.location.pathname,
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.labels'
        ].join(' '),
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
    };

    // UI Elements
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
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

    const commandHistory = document.createElement("div");
    commandHistory.id = "command-history";
    commandHistory.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 300px;
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

    // Network status monitoring
    window.addEventListener('online', () => {
        isOnline = true;
        showPopup("Connection restored", "ONLINE");
        speak("Connection restored. Ready for commands.");
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        showPopup("Connection lost", "OFFLINE");
        speak("I've lost internet connection. Please check your network.");
    });

    // Rate limiting check
    function checkRateLimit() {
        const now = Date.now();
        apiCallTimestamps = apiCallTimestamps.filter(timestamp => now - timestamp < 60000);
        
        if (apiCallTimestamps.length >= API_RATE_LIMIT) {
            const timeToWait = Math.ceil((apiCallTimestamps[0] + 60000 - now) / 1000);
            throw new Error(`Too many requests. Please wait ${timeToWait} seconds before trying again.`);
        }
        
        apiCallTimestamps.push(now);
        return true;
    }

    // Enhanced fetch with timeout and retry
    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = API_TIMEOUT, retries = 0 } = options;
        
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal  
            });
            
            clearTimeout(id);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            if (retries < MAX_RETRIES && error.name !== 'AbortError') {
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithTimeout(resource, { ...options, retries: retries + 1 });
            }
            throw error;
        }
    }

    // UI Functions
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
        }, 3000);
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

    // Speech Functions
    function processQueue() {
        if (speechQueue.length === 0 || isSpeaking) return;
        
        isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(speechQueue.shift());
        utterance.onend = () => {
            isSpeaking = false;
            if (speechQueue.length > 0) {
                processQueue();
            }
        };
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            isSpeaking = false;
            processQueue();
        };
        speechSynthesis.speak(utterance);
    }

    function speak(text) {
        try {
            if (!('speechSynthesis' in window)) {
                console.error("Speech synthesis not supported");
                return;
            }
            speechQueue.push(text);
            processQueue();
        } catch (error) {
            console.error("Error in speak function:", error);
        }
    }

    // Email Detection
    function containsEmail(text) {
        const emailPattern = /\b\w+(?:\s*(?:at|and)\s*\w+(?:\s*(?:dot|doht|dought)\s*(?:com|org|net|edu|gov|co|in|io)\b))/gi;
        const match = text.match(emailPattern);
        if (!match) return null;
        
        const potentialEmail = match[0]
            .replace(/\s*(at|and)\s*/gi, '@')
            .replace(/\s*(dot|doht|dought)\s*/gi, '.')
            .replace(/\s+/g, '')
            .toLowerCase();
        
        if (potentialEmail.includes('@') && potentialEmail.includes('.') && potentialEmail.length > 5) {
            return potentialEmail;
        }
        return null;
    }

    // Improved Authentication Functions
    function checkAuthStatus() {
        try {
            const accessToken = localStorage.getItem("access_token");
            const expiresAt = localStorage.getItem("expires_at");
            const refreshToken = localStorage.getItem("refresh_token");
            
            if (!accessToken || !refreshToken) {
                isAuthenticated = false;
                return false;
            }
            
            const now = new Date().getTime();
            const bufferTime = 300000; // 5 minutes buffer
            isAuthenticated = now < (parseInt(expiresAt) - bufferTime);
            
            return isAuthenticated;
        } catch (error) {
            console.error("Error checking auth status:", error);
            isAuthenticated = false;
            return false;
        }
    }

    async function ensureValidToken() {
        if (checkAuthStatus()) {
            return localStorage.getItem('access_token');
        }
        
        try {
            const refreshed = await refreshToken();
            if (refreshed) {
                return localStorage.getItem('access_token');
            }
        } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
        }
        
        initiateOAuthLogin();
        throw new Error("Authentication required. Please log in.");
    }

    async function refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            console.log("No refresh token available");
            return false;
        }
        
        try {
            const response = await fetchWithTimeout(
                OAUTH_CONFIG.tokenUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: OAUTH_CONFIG.clientId,
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken
                    }),
                    timeout: API_TIMEOUT
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Refresh token failed:', errorData);
                throw new Error(errorData.error || 'Refresh failed');
            }
            
            const data = await response.json();
            
            if (!data.access_token) {
                throw new Error('No access token in response');
            }
            
            const expiresAt = new Date().getTime() + (data.expires_in * 1000);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('expires_at', expiresAt.toString());
            
            // Store new refresh token if provided (Google doesn't always return one)
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            
            isAuthenticated = true;
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Clear invalid tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('expires_at');
            localStorage.removeItem('refresh_token');
            isAuthenticated = false;
            return false;
        }
    }

    function initiateOAuthLogin() {
        const state = crypto.randomUUID();
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('postAuthRedirect', window.location.href);
        
        const params = new URLSearchParams({
            client_id: OAUTH_CONFIG.clientId,
            redirect_uri: OAUTH_CONFIG.redirectUri,
            response_type: 'code',
            scope: OAUTH_CONFIG.scope,
            state: state,
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
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

        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
            console.error('State mismatch');
            speak("Login failed due to security error.");
            return;
        }
        sessionStorage.removeItem('oauth_state');

        if (code) {
            try {
                const response = await fetchWithTimeout(
                    OAUTH_CONFIG.tokenUrl,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            code: code,
                            client_id: OAUTH_CONFIG.clientId,
                            redirect_uri: OAUTH_CONFIG.redirectUri,
                            grant_type: 'authorization_code'
                        }),
                        timeout: API_TIMEOUT
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                const expiresAt = new Date().getTime() + (data.expires_in * 1000);
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('expires_at', expiresAt);
                isAuthenticated = true;
                
                const redirectUrl = sessionStorage.getItem('postAuthRedirect') || window.location.origin;
                window.location.href = redirectUrl;
            } catch (error) {
                console.error('Token exchange failed:', error);
                speak("Login failed. Please try again.");
            }
        }
    }

    if (window.location.search.includes('code=')) {
        handleOAuthResponse();
    }

    // Email Operations
    async function fetchEmails() {
        try {
            const accessToken = await ensureValidToken();
            showPopup("Fetching your emails...", "PROCESSING");
            
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "Failed to fetch emails");
            
            if (!data.messages || data.messages.length === 0) {
                speak("You have no new emails.");
                showPopup("No new emails", "INFO");
                return;
            }

            const email = data.messages[0];
            const emailResponse = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const emailData = await emailResponse.json();
            const headers = emailData.payload.headers;
            const from = headers.find(h => h.name.toLowerCase() === "from")?.value.split('<')[0].trim() || "Unknown sender";
            const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "No subject";
            
            const message = `You have new email from ${from}. Subject: ${subject}`;
            speak(message);
            showPopup(message, "EMAIL");
            addToHistory("Read emails", `Found email from ${from} about ${subject}`);
            
        } catch (error) {
            console.error("Error fetching emails:", error);
            
            let errorMessage = "Sorry, I couldn't fetch your emails.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (error.message.includes("Too many requests")) {
                errorMessage = error.message;
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            showPopup(errorMessage, "ERROR");
        }
    }

    async function findMessageIdByPosition(position) {
        try {
            const accessToken = await ensureValidToken();
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            if (!data.messages?.length) return null;
            
            let index = 0;
            if (position.includes('first')) index = 0;
            else if (position.includes('last')) index = data.messages.length - 1;
            else if (position.includes('second')) index = 1;
            else if (position.includes('third')) index = 2;
            
            return data.messages[index].id;
        } catch (error) {
            console.error('Error finding message:', error);
            
            let errorMessage = "Failed to find email.";
            if (error.message.includes("Authentication")) {
                errorMessage = "Authentication required. Please log in.";
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            }
            
            speak(errorMessage);
            return null;
        }
    }

    async function findMessageIdByPositionAndFolder(position, folder = 'inbox') {
        try {
            const accessToken = await ensureValidToken();
            const folderMap = {
                'inbox': 'INBOX',
                'spam': 'SPAM',
                'trash': 'TRASH',
                'sent': 'SENT',
                'drafts': 'DRAFTS'
            };
            const labelId = folderMap[folder.toLowerCase()] || 'INBOX';
            
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=${labelId}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            if (!data.messages?.length) return null;
            
            let index = 0;
            if (position.includes('first')) index = 0;
            else if (position.includes('last')) index = data.messages.length - 1;
            else if (position.includes('second')) index = 1;
            else if (position.includes('third')) index = 2;
            
            return data.messages[index].id;
        } catch (error) {
            console.error('Error finding message:', error);
            
            let errorMessage = "Failed to find email.";
            if (error.message.includes("Authentication")) {
                errorMessage = "Authentication required. Please log in.";
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            }
            
            speak(errorMessage);
            return null;
        }
    }

    async function findMessageIdBySender(email) {
        try {
            const accessToken = await ensureValidToken();
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=from:${encodeURIComponent(email)}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            return data.messages?.[0]?.id || null;
        } catch (error) {
            console.error('Error finding message by sender:', error);
            
            let errorMessage = "Failed to find email.";
            if (error.message.includes("Authentication")) {
                errorMessage = "Authentication required. Please log in.";
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            }
            
            speak(errorMessage);
            return null;
        }
    }

    async function sendEmail(to, subject, body) {
        try {
            const accessToken = await ensureValidToken();
            const normalizedEmail = containsEmail(to) || to;
            const cleanEmail = normalizedEmail.replace(/\s*(at|and)\s*/gi, '@')
                                            .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                            .replace(/\s+/g, '');
            
            if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
                speak("That doesn't look like a valid email address. Please try saying the full email address clearly.");
                addToHistory(`Send email to ${to}`, "Invalid email address");
                return;
            }

            const rawEmail = [
                `To: ${cleanEmail}`,
                `Subject: ${subject}`,
                "",
                body
            ].join("\n");
            
            const base64Email = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g, '-').replace(/\//g, '_');
            
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        raw: base64Email
                    }),
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            speak("Email sent successfully");
            addToHistory(`Send email to ${cleanEmail}`, "Email sent successfully");
            return data;
        } catch (error) {
            console.error("Error sending email:", error);
            
            let errorMessage = "Failed to send email.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (error.message.includes("Too many requests")) {
                errorMessage = error.message;
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            addToHistory("Send email", errorMessage);
            throw error;
        }
    }

    async function replyToEmail(messageId, body) {
        try {
            const accessToken = await ensureValidToken();
            
            // First get the original message to reply to
            const originalResponse = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const originalData = await originalResponse.json();
            const headers = originalData.payload.headers;
            
            const from = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
            const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
            const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
            
            const rawEmail = [
                `To: ${from}`,
                `Subject: ${replySubject}`,
                `In-Reply-To: <${originalData.id}>`,
                `References: <${originalData.id}>`,
                "",
                body
            ].join("\n");
            
            const base64Email = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g, '-').replace(/\//g, '_');
            
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        raw: base64Email
                    }),
                    timeout: API_TIMEOUT
                }
            );
            
            const data = await response.json();
            speak("Reply sent successfully");
            addToHistory(`Reply to email ${messageId}`, "Reply sent successfully");
            return data;
        } catch (error) {
            console.error("Error replying to email:", error);
            
            let errorMessage = "Failed to send reply.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (error.message.includes("Too many requests")) {
                errorMessage = error.message;
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            addToHistory("Reply to email", errorMessage);
            throw error;
        }
    }

    async function archiveEmail(messageId) {
        try {
            const accessToken = await ensureValidToken();
            await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        removeLabelIds: ['INBOX']
                    }),
                    timeout: API_TIMEOUT
                }
            );
            
            speak("Email archived");
            addToHistory(`Archive email ${messageId}`, "Email archived");
        } catch (error) {
            console.error("Error archiving email:", error);
            
            let errorMessage = "Failed to archive email.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            addToHistory(`Archive email ${messageId}`, errorMessage);
            throw error;
        }
    }

    async function markAsRead(messageId, read = true) {
        try {
            const accessToken = await ensureValidToken();
            const action = read ? "read" : "unread";
            
            await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        removeLabelIds: read ? ['UNREAD'] : [],
                        addLabelIds: read ? [] : ['UNREAD']
                    }),
                    timeout: API_TIMEOUT
                }
            );
            
            speak(`Email marked as ${action}`);
            addToHistory(`Mark email as ${action}`, "Status updated");
        } catch (error) {
            console.error(`Error marking email as ${read ? 'read' : 'unread'}:`, error);
            
            let errorMessage = `Failed to mark email as ${action}.`;
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            addToHistory(`Mark email as ${action}`, errorMessage);
            throw error;
        }
    }

    async function deleteEmail(messageId) {
        try {
            const accessToken = await ensureValidToken();
            await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    timeout: API_TIMEOUT
                }
            );
            
            speak("Email moved to trash");
            addToHistory(`Delete email ${messageId}`, "Email deleted");
        } catch (error) {
            console.error("Error deleting email:", error);
            
            let errorMessage = "Failed to delete email.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            addToHistory(`Delete email ${messageId}`, errorMessage);
            throw error;
        }
    }

    async function readFullEmail(messageId) {
        try {
            const accessToken = await ensureValidToken();
            const response = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: API_TIMEOUT
                }
            );
            
            const emailData = await response.json();
            const headers = emailData.payload.headers;
            const from = headers.find(h => h.name.toLowerCase() === "from")?.value.split('<')[0].trim() || "Unknown sender";
            const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "No subject";
            const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "Unknown date";
            
            let body = "";
            if (emailData.payload.parts) {
                const textPart = emailData.payload.parts.find(part => part.mimeType === "text/plain");
                if (textPart) {
                    body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }
            } else if (emailData.payload.body.data) {
                body = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            
            body = body.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            const message = `Email from ${from}, received ${date}. Subject: ${subject}. ${body.substring(0, 500)}`;
            speak(message);
            showPopup(`Reading email: ${subject}`, "EMAIL");
            addToHistory(`Read email ${messageId}`, `From ${from} about ${subject}`);
            
        } catch (error) {
            console.error("Error reading email:", error);
            
            let errorMessage = "Sorry, I couldn't read that email.";
            if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                errorMessage = "Your session expired. Please log in again.";
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(errorMessage);
            showPopup("Error reading email", "ERROR");
            addToHistory(`Read email ${messageId}`, errorMessage);
        }
    }

    // Command Parsing
    function parseCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();
        const emailInCommand = containsEmail(lowerTranscript);
        
        const commandPatterns = [
            {
                regex: /^(?:reply|respond)(?:\s+to)?\s+(.+?)(?:\s+email)?(?:\s+with\s+(.+))?$/i,
                action: 'reply',
                extract: (match) => {
                    const target = containsEmail(match[1]) || match[1];
                    return { 
                        target,
                        body: match[2] || "No content provided"
                    };
                }
            },
            {
                regex: /^send(?:\s+(?:an?)?)?\s+email(?:\s+to)?\s+(.+?)(?:\s+with\s+subject\s+(.+?))?(?:\s+saying\s+(.+))?$/i,
                action: 'send',
                extract: (match) => {
                    const to = containsEmail(match[1]) || match[1];
                    return {
                        to,
                        subject: match[2] || "No subject",
                        body: match[3] || "No content"
                    };
                }
            },
            {
                regex: /^delete(?:\s+the)?\s+(.+?)(?:\s+email)?(?:\s+in\s+(.+?))?$/i,
                action: 'delete',
                extract: (match) => ({
                    position: match[1],
                    folder: match[2] || "inbox"
                })
            },
            {
                regex: /^mark(?:\s+all)?\s+(.+?)(?:\s+emails?)?(?:\s+as\s+)?(read|unread)(?:\s+in\s+(.+?))?$/i,
                action: 'markStatus',
                extract: (match) => ({
                    filter: match[1],
                    status: match[2],
                    folder: match[3] || "inbox"
                })
            },
            {
                regex: /^read(?:\s+the)?\s+(.+?)(?:\s+email)?(?:\s+in\s+(.+?))?$/i,
                action: 'readEmail',
                extract: (match) => ({
                    position: match[1],
                    folder: match[2] || "inbox"
                })
            },
            {
                regex: /^(?:open|show|read)\s+email\s+(?:from|to)?\s*(.+@.+\.\w+)/i,
                action: 'openEmailFrom',
                extract: (match) => ({
                    email: containsEmail(match[1]) || match[1]
                })
            },
            {
                regex: /^reply\s+with\s+(.+)/i,
                action: 'quickReply',
                extract: (match) => ({
                    body: match[1]
                })
            },
            {
                regex: /^email\s+(.+@.+\.\w+)/i,
                action: 'handleEmailAddress',
                extract: (match) => ({
                    email: containsEmail(match[1]) || match[1]
                })
            }
        ];

        for (const pattern of commandPatterns) {
            const match = lowerTranscript.match(pattern.regex);
            if (match) {
                const extracted = pattern.extract(match);
                return {
                    action: pattern.action,
                    ...extracted
                };
            }
        }

        const emailAddress = containsEmail(lowerTranscript);
        if (emailAddress) {
            return {
                action: 'handleEmailAddress',
                email: emailAddress
            };
        }

        return null;
    }

    // Command Handlers
    async function handleEmailAddressCommand(email) {
        const normalizedEmail = email.replace(/\s*(at|and)\s*/gi, '@')
                                   .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                   .replace(/\s+/g, '');
        
        speak(`I detected the email address ${normalizedEmail}. Would you like to compose an email to this address or search for emails from them?`);
        addToHistory(`Email mentioned: ${normalizedEmail}`, "Prompting for action");
        
        recognition.start();
    }

    async function handleOpenEmailFromCommand(email) {
        const normalizedEmail = email.replace(/\s*(at|and)\s*/gi, '@')
                                   .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                   .replace(/\s+/g, '');
        
        const messageId = await findMessageIdBySender(normalizedEmail);
        if (messageId) {
            await readFullEmail(messageId);
            addToHistory(`Read email from ${normalizedEmail}`, "Email read aloud");
        } else {
            speak(`Could not find an email from ${normalizedEmail}`);
            addToHistory(`Read email from ${normalizedEmail}`, "No email found");
        }
    }

    async function handleReplyCommand(target, body) {
        const extractedTarget = containsEmail(target) || target;
        const normalizedTarget = extractedTarget.replace(/\s*(at|and)\s*/gi, '@')
                                              .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                              .replace(/\s+/g, '');
        
        if (normalizedTarget.includes('@')) {
            const messageId = await findMessageIdBySender(normalizedTarget);
            if (messageId) {
                await replyToEmail(messageId, body);
                speak(`Reply sent to email from ${normalizedTarget}`);
                addToHistory(`Reply to email from ${normalizedTarget}`, "Reply sent");
            } else {
                speak(`Could not find an email from ${normalizedTarget}. Would you like to compose a new email to them?`);
                addToHistory(`Reply to email from ${normalizedTarget}`, "No email found");
            }
        } else {
            const messageId = await findMessageIdByPosition(normalizedTarget);
            if (messageId) {
                await replyToEmail(messageId, body);
                speak(`Reply sent to the ${normalizedTarget} email`);
                addToHistory(`Reply to ${normalizedTarget} email`, "Reply sent");
            } else {
                speak(`Could not find the ${normalizedTarget} email`);
                addToHistory(`Reply to ${normalizedTarget} email`, "No email found");
            }
        }
    }

    async function handleSendCommand(to, subject, body) {
        await sendEmail(to, subject, body);
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

    async function handleQuickReplyCommand(body) {
        // This would work with a context-aware system that remembers the last email you were reading
        speak("Quick reply functionality would require tracking the current email context.");
        addToHistory("Quick reply", "Need context tracking implementation");
    }

    async function executeEnhancedCommand(parsedCommand) {
        try {
            if (!parsedCommand) {
                throw new Error("I didn't understand that command. Please try again.");
            }

            if (!isOnline) {
                throw new Error("No internet connection available. Please check your network.");
            }

            // Ensure we're authenticated before proceeding
            await ensureValidToken();

            switch (parsedCommand.action) {
                case 'reply':
                    await handleReplyCommand(parsedCommand.target, parsedCommand.body);
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
                case 'openEmailFrom':
                    await handleOpenEmailFromCommand(parsedCommand.email);
                    break;
                case 'quickReply':
                    await handleQuickReplyCommand(parsedCommand.body);
                    break;
                case 'handleEmailAddress':
                    await handleEmailAddressCommand(parsedCommand.email);
                    break;
                default:
                    throw new Error("I don't know how to handle that command yet.");
            }
        } catch (error) {
            console.error("Command execution error:", error);
            
            let errorMessage = error.response?.data?.error?.message || error.message;
            
            if (error.message.includes("Too many requests")) {
                errorMessage = error.message;
            } else if (error.message.includes("Authentication")) {
                errorMessage = "Please log in to continue.";
            } else if (!isOnline) {
                errorMessage = "No internet connection available.";
            } else if (error.name === "AbortError") {
                errorMessage = "Request timed out. Please try again.";
            }
            
            speak(`Error: ${errorMessage}`);
            addToHistory("Command failed", errorMessage);
            
            if (!isOnline || error.name === "AbortError") {
                speak("You can try again when you're back online.");
            }
        }
    }

    // Recognition handlers
    recognition.onstart = () => {
        isListening = true;
        micIndicator.style.background = "green";
        showPopup("Microphone activated - Listening...", "ON");
        speak("Ready for your commands");
    };

    recognition.onresult = (event) => {
        let result = event.results[event.results.length - 1][0];
        let transcript = result.transcript.trim();
        let confidence = result.confidence;

        if (confidence < 0.7) return;

        transcript = transcript.replace(/\s(at|and)\s/gi, '@')
                              .replace(/\s(dot|doht|dought)\s/gi, '.')
                              .replace(/\s(gmail|male|mail)\s/gi, 'gmail')
                              .replace(/\s(com|calm|come|con)\b/gi, 'com');

        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
        let sleepCommands = ["sleep email", "stop email", "turn off email"];

        if (wakeWords.some(word => transcript.toLowerCase().includes(word))) {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");
            speak("Voice control activated. How can I assist?");
            addToHistory("Wake word detected", "Voice control activated");
            return;
        }

        if (sleepCommands.some(word => transcript.toLowerCase().includes(word))) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speak("Voice control deactivated. Say 'Hey email' to reactivate.");
            addToHistory("Sleep command", "Voice control deactivated");
            return;
        }

        if (isActive) {
            const parsedCommand = parseCommand(transcript);
            if (parsedCommand) {
                executeEnhancedCommand(parsedCommand);
            } else {
                executeSimpleCommand(transcript);
            }
        }
    };

    recognition.onend = () => {
        isListening = false;
        micIndicator.style.background = "red";
        if (wakeWordDetected || !isActive) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    // Simple command execution
    function executeSimpleCommand(transcript) {
        let now = Date.now();
        
        if (now - lastCommandTime < 3000) return;
        lastCommandTime = now;

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
            simpleCommands[command].some(phrase => transcript.toLowerCase().includes(phrase))
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

    // Initialize
    function initializeApp() {
        console.log("Initializing application...");
        
        const authStatus = checkAuthStatus();
        console.log("Initial auth status:", authStatus);
        
        recognition.start();
        
        setInterval(() => {
            const wasAuthenticated = isAuthenticated;
            checkAuthStatus();
            if (wasAuthenticated && !isAuthenticated) {
                speak("Your session has expired. Please log in again.");
            }
        }, 300000); // 5 minutes
    }

    initializeApp();
}