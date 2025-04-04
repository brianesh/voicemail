if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
    alert("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
} else if (!('speechSynthesis' in window)) {
    console.error("Speech Synthesis not supported in this browser.");
    alert("Your browser doesn't support speech synthesis. Please use Chrome or Edge.");
} else {
    // Main application class
    class VoiceEmailAssistant {
        constructor() {
            this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new this.SpeechRecognition();
            this.cleanupFunctions = [];
            
            // State variables
            this.isActive = true;
            this.wakeWordDetected = true;
            this.isListening = false;
            this.lastCommandTime = 0;
            this.isAuthenticated = false;
            this.speechQueue = [];
            this.isSpeaking = false;
            this.apiCallTimestamps = [];
            this.isOnline = navigator.onLine;
            this.retryAttempts = 0;
            this.MAX_RETRIES = 2;
            this.API_RATE_LIMIT = 5;
            this.API_TIMEOUT = 10000;
            this.pendingCommand = null;

            // OAuth Configuration - Modified for implicit flow
            this.OAUTH_CONFIG = {
                clientId: '629991621617-u5vp7bh2dm1vd36u2laeppdjt74uc56h.apps.googleusercontent.com',
                redirectUri: 'http://localhost:8080/oauth-callback',
                scope: [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.modify',
                    'https://www.googleapis.com/auth/gmail.send'
                ].join(' '),
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            };

            // Initialize the app
            this.initUI();
            this.initEventListeners();
            this.initRecognition();
            this.checkAuthStatus();

                if (window.location.hash.includes('access_token=')) {
                    this.handleOAuthResponse();
                } else {
                    // Check URL params for auth success
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('auth_success') === 'true') {
                        this.isAuthenticated = this.checkAuthStatus();
                        
                        // Execute pending command if one exists
                        if (urlParams.get('pending_command') === 'true') {
                            const pendingCommand = sessionStorage.getItem('pendingCommand');
                            if (pendingCommand) {
                                try {
                                    const command = JSON.parse(pendingCommand);
                                    setTimeout(() => {
                                        this.executeEnhancedCommand(command);
                                    }, 1000);
                                } catch (error) {
                                    console.error('Error executing pending command:', error);
                                }
                                sessionStorage.removeItem('pendingCommand');
                            }
                        }
                        
                        // Clean up URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }
            }

        // Initialization methods
        initUI() {
            if (!document.getElementById('speech-popup')) {
                this.popup = document.createElement("div");
                this.popup.id = "speech-popup";
                this.popup.style.cssText = `
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
                document.body.appendChild(this.popup);
            }

            if (!document.getElementById('mic-indicator')) {
                this.micIndicator = document.createElement("div");
                this.micIndicator.id = "mic-indicator";
                this.micIndicator.style.cssText = `
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
                document.body.appendChild(this.micIndicator);
            }

            if (!document.getElementById('command-history')) {
                this.commandHistory = document.createElement("div");
                this.commandHistory.id = "command-history";
                this.commandHistory.style.cssText = `
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
                document.body.appendChild(this.commandHistory);
            }

            if (!document.getElementById('login-button')) {
                this.loginButton = document.createElement("button");
                this.loginButton.id = "login-button";
                this.loginButton.textContent = "Login with Google";
                this.loginButton.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 15px;
                    background: #4285F4;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    z-index: 10001;
                `;
                this.loginButton.onclick = () => this.startAuthFlow();
                document.body.appendChild(this.loginButton);
            }
        }

        initEventListeners() {
            const onlineHandler = () => {
                this.isOnline = true;
                this.showPopup("Connection restored", "ONLINE");
                this.speak("Connection restored. Ready for commands.");
            };

            const offlineHandler = () => {
                this.isOnline = false;
                this.showPopup("Connection lost", "OFFLINE");
                this.speak("I've lost internet connection. Please check your network.");
            };

            window.addEventListener('online', onlineHandler);
            window.addEventListener('offline', offlineHandler);

            this.cleanupFunctions.push(() => {
                window.removeEventListener('online', onlineHandler);
                window.removeEventListener('offline', offlineHandler);
            });
        }

        initRecognition() {
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = "en-US";

            this.recognition.onstart = () => {
                this.isListening = true;
                this.micIndicator.style.background = "green";
                this.showPopup("Microphone activated - Listening...", "ON");
                this.speak("Ready for your commands");
            };

            this.recognition.onresult = (event) => {
                let result = event.results[event.results.length - 1][0];
                let transcript = result.transcript.trim();
                let confidence = result.confidence;

                if (confidence < 0.7) return;

                transcript = transcript.replace(/\s(at|and)\s/gi, '@')
                                    .replace(/\s(dot|doht|dought)\s/gi, '.')
                                    .replace(/\s(gmail|male|mail)\s/gi, 'gmail')
                                    .replace(/\s(com|calm|come|con)\b/gi, 'com');

                console.log("You said:", transcript);
                this.showPopup(transcript, this.isActive ? "ON" : "OFF");

                let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
                let sleepCommands = ["sleep email", "stop email", "turn off email"];

                if (wakeWords.some(word => transcript.toLowerCase().includes(word))) {
                    this.isActive = true;
                    this.wakeWordDetected = true;
                    this.showPopup("Voice Control Activated", "ACTIVE");
                    this.speak("Voice control activated. How can I assist?");
                    this.addToHistory("Wake word detected", "Voice control activated");
                    return;
                }

                if (sleepCommands.some(word => transcript.toLowerCase().includes(word))) {
                    this.isActive = false;
                    this.wakeWordDetected = false;
                    this.showPopup("Voice Control Deactivated", "SLEEP");
                    this.speak("Voice control deactivated. Say 'Hey email' to reactivate.");
                    this.addToHistory("Sleep command", "Voice control deactivated");
                    return;
                }

                if (this.isActive) {
                    this.executeCommand(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Recognition error:', event.error);
                this.micIndicator.style.background = "orange";
                
                let errorMessage = "Error in speech recognition";
                if (event.error === 'no-speech') {
                    errorMessage = "No speech detected";
                } else if (event.error === 'audio-capture') {
                    errorMessage = "Microphone not available";
                } else if (event.error === 'not-allowed') {
                    errorMessage = "Microphone access denied";
                }
                
                this.showPopup(errorMessage, "ERROR");
                
                setTimeout(() => this.recognition.start(), 1000);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.micIndicator.style.background = "red";
                if (this.wakeWordDetected || !this.isActive) {
                    setTimeout(() => this.recognition.start(), 1000);
                }
            };

            this.recognition.start();
        }

        // UI Functions
        showPopup(message, status) {
            this.popup.innerHTML = `<b>Status:</b> ${status} <br> <b>You said:</b> ${message}`;
            this.popup.style.display = "block";
            this.popup.style.opacity = "1";

            clearTimeout(this.popup.hideTimeout);
            this.popup.hideTimeout = setTimeout(() => {
                this.popup.style.opacity = "0";
                setTimeout(() => {
                    this.popup.style.display = "none";
                }, 500);
            }, 2500);
        }

        addToHistory(command, response) {
            const entry = document.createElement("div");
            entry.innerHTML = `<b>You:</b> ${command}<br><b>System:</b> ${response}`;
            entry.style.marginBottom = "10px";
            entry.style.borderBottom = "1px solid #444";
            entry.style.paddingBottom = "10px";
            this.commandHistory.insertBefore(entry, this.commandHistory.firstChild);
            
            if (this.commandHistory.children.length > 5) {
                this.commandHistory.removeChild(this.commandHistory.lastChild);
            }
            
            this.commandHistory.style.display = "block";
        }

        // Speech Functions
        processQueue() {
            if (this.speechQueue.length === 0 || this.isSpeaking) return;
            
            this.isSpeaking = true;
            const utterance = new SpeechSynthesisUtterance(this.speechQueue.shift());
            utterance.onend = () => {
                this.isSpeaking = false;
                if (this.speechQueue.length > 0) {
                    this.processQueue();
                }
            };
            utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event.error);
                this.isSpeaking = false;
                this.processQueue();
            };
            speechSynthesis.speak(utterance);
        }

        speak(text) {
            try {
                window.speechSynthesis.cancel();
                this.speechQueue.push(text);
                this.processQueue();
            } catch (error) {
                console.error("Error in speak function:", error);
            }
        }

        // Email Detection
        containsEmail(text) {
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

        // Authentication Functions
        checkAuthStatus() {
            const token = localStorage.getItem('access_token');
            const expiresAt = localStorage.getItem('expires_at');
            const isExpired = expiresAt && (Date.now() > parseInt(expiresAt));
            
            // Clear invalid tokens
            if ((token && isExpired) || (token && !expiresAt)) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                this.isAuthenticated = false;
                document.getElementById('login-button').style.display = 'block';
                return false;
            }
            
            if (token && !isExpired) {
                this.isAuthenticated = true;
                document.getElementById('login-button').style.display = 'none';
                return true;
            }
            
            this.isAuthenticated = false;
            document.getElementById('login-button').style.display = 'block';
            return false;
        }
        
        async ensureValidToken() {
            if (this.checkAuthStatus()) {
                return localStorage.getItem('access_token');
            }
            
            // Store the current command as pending
            if (this.currentCommand) {
                this.pendingCommand = this.currentCommand;
            }
            
            // Start auth flow and throw error to stop current operation
            this.startAuthFlow();
            throw new Error("Redirecting to login...");
        }
        
        
        async startAuthFlow() {
            // Store the current URL and any pending command
            sessionStorage.setItem('preAuthUrl', window.location.href);
            if (this.pendingCommand) {
                sessionStorage.setItem('pendingCommand', JSON.stringify(this.pendingCommand));
            }
            
            const authUrl = new URL(this.OAUTH_CONFIG.authUrl);
            authUrl.searchParams.append('response_type', 'token');
            authUrl.searchParams.append('client_id', this.OAUTH_CONFIG.clientId);
            authUrl.searchParams.append('redirect_uri', this.OAUTH_CONFIG.redirectUri);
            authUrl.searchParams.append('scope', this.OAUTH_CONFIG.scope);
            authUrl.searchParams.append('prompt', 'consent');
            // Removed: authUrl.searchParams.append('access_type', 'offline');
            
            window.location.href = authUrl.toString();
        }
        async handleOAuthResponse() {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            if (hashParams.get('error')) {
                const error = hashParams.get('error');
                console.error('OAuth Error:', error);
                this.showPopup(`Auth Error: ${error}`, "ERROR");
                return;
            }
            
            const accessToken = hashParams.get('access_token');
            if (!accessToken) {
                console.error('Missing access token');
                this.showPopup("Missing access token", "ERROR");
                return;
            }
            
            const expiresIn = parseInt(hashParams.get('expires_in') || '3600');
            const expiresAt = Date.now() + (expiresIn * 1000);
            
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('expires_at', expiresAt);
            this.isAuthenticated = true;
            
            // Get the original URL and pending command
            const originalUrl = sessionStorage.getItem('preAuthUrl') || 'https://mail.google.com';
            const pendingCommand = sessionStorage.getItem('pendingCommand');
            
            // Clear the stored values
            sessionStorage.removeItem('preAuthUrl');
            sessionStorage.removeItem('pendingCommand');
            
            // Redirect to original page
            window.location.href = originalUrl;
            
            // If there was a pending command, execute it after a short delay
            if (pendingCommand) {
                setTimeout(() => {
                    try {
                        const command = JSON.parse(pendingCommand);
                        this.executeEnhancedCommand(command);
                    } catch (error) {
                        console.error('Error executing pending command:', error);
                    }
                }, 1500);
            }
        }
        
        // Network and API Functions
        checkRateLimit() {
            const now = Date.now();
            this.apiCallTimestamps = this.apiCallTimestamps.filter(timestamp => now - timestamp < 60000);
            
            if (this.apiCallTimestamps.length >= this.API_RATE_LIMIT) {
                const timeToWait = Math.ceil((this.apiCallTimestamps[0] + 60000 - now) / 1000);
                throw new Error(`Too many requests. Please wait ${timeToWait} seconds before trying again.`);
            }
            
            this.apiCallTimestamps.push(now);
            return true;
        }

        async fetchWithTimeout(resource, options = {}) {
            const { timeout = this.API_TIMEOUT } = options;
            
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal  
            });
            
            clearTimeout(id);
            return response;
        }

        async withRetry(fn, args, operationName) {
            this.retryAttempts = 0;
            
            while (this.retryAttempts <= this.MAX_RETRIES) {
                try {
                    if (!this.isOnline) {
                        throw new Error("No internet connection available");
                    }
                    
                    this.checkRateLimit();
                    return await fn(...args);
                } catch (error) {
                    this.retryAttempts++;
                    
                    if (this.retryAttempts > this.MAX_RETRIES) {
                        console.error(`Failed after ${this.MAX_RETRIES} attempts for ${operationName}:`, error);
                        throw error;
                    }
                    
                    const delay = Math.pow(2, this.retryAttempts) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    if (error.message.includes("Authentication")) {
                        await this.ensureValidToken();
                    }
                }
            }
        }

        // Email Operations
        async fetchEmails() {
            try {
                const accessToken = await this.ensureValidToken();
                this.showPopup("Fetching your emails...", "PROCESSING");
                
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=3&q=is:unread`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "fetchEmails"
                );
                
                const data = await response.json();
                if (data.error) throw new Error(data.error.message || "Failed to fetch emails");
                
                if (!data.messages || data.messages.length === 0) {
                    this.speak("You have no new emails.");
                    this.showPopup("No new emails", "INFO");
                    return;
                }

                const email = data.messages[0];
                const emailResponse = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "fetchEmailContent"
                );
                
                const emailData = await emailResponse.json();
                const headers = emailData.payload.headers;
                const from = headers.find(h => h.name.toLowerCase() === "from")?.value.split('<')[0].trim() || "Unknown sender";
                const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "No subject";
                
                const message = `You have new email from ${from}. Subject: ${subject}`;
                this.speak(message);
                this.showPopup(message, "EMAIL");
                this.addToHistory("Read emails", `Found email from ${from} about ${subject}`);
                
            } catch (error) {
                console.error("Error fetching emails:", error);
                
                let errorMessage = "Sorry, I couldn't fetch your emails.";
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (error.message.includes("Too many requests")) {
                    errorMessage = error.message;
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.showPopup(errorMessage, "ERROR");
            }
        }

        async findMessageIdByPosition(position) {
            try {
                const accessToken = await this.ensureValidToken();
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "findMessageByPosition"
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
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                }
                
                this.speak(errorMessage);
                return null;
            }
        }

        async findMessageIdByPositionAndFolder(position, folder = 'inbox') {
            try {
                const accessToken = await this.ensureValidToken();
                const folderMap = {
                    'inbox': 'INBOX',
                    'spam': 'SPAM',
                    'trash': 'TRASH',
                    'sent': 'SENT',
                    'drafts': 'DRAFTS'
                };
                const labelId = folderMap[folder.toLowerCase()] || 'INBOX';
                
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=${labelId}`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "findMessageByPositionAndFolder"
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
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                }
                
                this.speak(errorMessage);
                return null;
            }
        }

        async findMessageIdBySender(email) {
            try {
                const accessToken = await this.ensureValidToken();
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=from:${encodeURIComponent(email)}`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "findMessageBySender"
                );
                
                const data = await response.json();
                return data.messages?.[0]?.id || null;
            } catch (error) {
                console.error('Error finding message by sender:', error);
                
                let errorMessage = "Failed to find email.";
                if (error.message.includes("Authentication")) {
                    errorMessage = "Authentication required. Please log in.";
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                }
                
                this.speak(errorMessage);
                return null;
            }
        }

        async sendEmail(to, subject, body) {
            try {
                const accessToken = await this.ensureValidToken();
                const normalizedEmail = this.containsEmail(to) || to;
                const cleanEmail = normalizedEmail.replace(/\s*(at|and)\s*/gi, '@')
                                                .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                                .replace(/\s+/g, '');
                
                if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
                    this.speak("That doesn't look like a valid email address. Please try saying the full email address clearly.");
                    this.addToHistory(`Send email to ${to}`, "Invalid email address");
                    return;
                }

                const rawEmail = [
                    `To: ${cleanEmail}`,
                    `Subject: ${subject}`,
                    "",
                    body
                ].join("\n");
                
                const base64Email = btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_');
                
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
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
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "sendEmail"
                );
                
                const data = await response.json();
                this.speak("Email sent successfully");
                this.addToHistory(`Send email to ${cleanEmail}`, "Email sent successfully");
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
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.addToHistory("Send email", errorMessage);
                throw error;
            }
        }

        async archiveEmail(messageId) {
            try {
                const accessToken = await this.ensureValidToken();
                await this.withRetry(
                    this.fetchWithTimeout,
                    [
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
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "archiveEmail"
                );
                
                this.speak("Email archived");
                this.addToHistory(`Archive email ${messageId}`, "Email archived");
            } catch (error) {
                console.error("Error archiving email:", error);
                
                let errorMessage = "Failed to archive email.";
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.addToHistory(`Archive email ${messageId}`, errorMessage);
                throw error;
            }
        }

        async markAsRead(messageId, read = true) {
            try {
                const accessToken = await this.ensureValidToken();
                const action = read ? "read" : "unread";
                
                await this.withRetry(
                    this.fetchWithTimeout,
                    [
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
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "markAsRead"
                );
                
                this.speak(`Email marked as ${action}`);
                this.addToHistory(`Mark email as ${action}`, "Status updated");
            } catch (error) {
                console.error(`Error marking email as ${read ? 'read' : 'unread'}:`, error);
                
                let errorMessage = `Failed to mark email as ${action}.`;
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.addToHistory(`Mark email as ${action}`, errorMessage);
                throw error;
            }
        }

        async deleteEmail(messageId) {
            try {
                const accessToken = await this.ensureValidToken();
                await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
                        {
                            method: "POST",
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "deleteEmail"
                );
                
                this.speak("Email moved to trash");
                this.addToHistory(`Delete email ${messageId}`, "Email deleted");
            } catch (error) {
                console.error("Error deleting email:", error);
                
                let errorMessage = "Failed to delete email.";
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.addToHistory(`Delete email ${messageId}`, errorMessage);
                throw error;
            }
        }

        async readFullEmail(messageId) {
            try {
                const accessToken = await this.ensureValidToken();
                const response = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "readFullEmail"
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
                this.speak(message);
                this.showPopup(`Reading email: ${subject}`, "EMAIL");
                this.addToHistory(`Read email ${messageId}`, `From ${from} about ${subject}`);
                
            } catch (error) {
                console.error("Error reading email:", error);
                
                let errorMessage = "Sorry, I couldn't read that email.";
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.showPopup("Error reading email", "ERROR");
                this.addToHistory(`Read email ${messageId}`, errorMessage);
            }
        }

        async markAllEmailsInFolder(folder, read = true) {
            try {
                const accessToken = await this.ensureValidToken();
                const labelMap = {
                    'inbox': 'INBOX',
                    'spam': 'SPAM',
                    'trash': 'TRASH',
                    'sent': 'SENT',
                    'drafts': 'DRAFTS'
                };
                const labelId = labelMap[folder.toLowerCase()] || 'INBOX';
                
                const listResponse = await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}`,
                        {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "listEmailsInFolder"
                );
                
                const listData = await listResponse.json();
                if (!listData.messages || listData.messages.length === 0) return;
                
                const messageIds = listData.messages.map(msg => msg.id);
                
                await this.withRetry(
                    this.fetchWithTimeout,
                    [
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                ids: messageIds,
                                removeLabelIds: read ? ['UNREAD'] : [],
                                addLabelIds: read ? [] : ['UNREAD']
                            }),
                            timeout: this.API_TIMEOUT
                        }
                    ],
                    "markAllEmailsInFolder"
                );
                
                this.speak(`Marked all emails in ${folder} as ${read ? 'read' : 'unread'}`);
                this.addToHistory(`Mark all emails in ${folder}`, `Status updated to ${read ? 'read' : 'unread'}`);
            } catch (error) {
                console.error('Error marking all emails:', error);
                
                let errorMessage = "Failed to mark emails.";
                if (error.message.includes("Invalid Credentials") || error.message.includes("token expired")) {
                    errorMessage = "Your session expired. Please log in again.";
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(errorMessage);
                this.addToHistory("Mark all emails", errorMessage);
                throw error;
            }
        }

        // Command Parsing and Execution
        parseCommand(transcript) {
            const lowerTranscript = transcript.toLowerCase().trim();
            const emailInCommand = this.containsEmail(lowerTranscript);
            
            const commandPatterns = [
                {
                    regex: /^(?:reply|respond)(?:\s+to)?\s+(.+?)(?:\s+email)?$/i,
                    action: 'reply',
                    extract: (match) => {
                        const target = this.containsEmail(match[1]) || match[1];
                        return { target };
                    }
                },
                {
                    regex: /^send(?:\s+(?:an?)?)?\s+email(?:\s+to)?\s+(.+?)(?:\s+with\s+subject\s+(.+?))?(?:\s+saying\s+(.+))?$/i,
                    action: 'send',
                    extract: (match) => {
                        const to = this.containsEmail(match[1]) || match[1];
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
                        email: this.containsEmail(match[1]) || match[1]
                    })
                },
                {
                    regex: /^email\s+(.+@.+\.\w+)/i,
                    action: 'handleEmailAddress',
                    extract: (match) => ({
                        email: this.containsEmail(match[1]) || match[1]
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

            const emailAddress = this.containsEmail(lowerTranscript);
            if (emailAddress) {
                return {
                    action: 'handleEmailAddress',
                    email: emailAddress
                };
            }

            return null;
        }

        async handleEmailAddressCommand(email) {
            const normalizedEmail = email.replace(/\s*(at|and)\s*/gi, '@')
                                       .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                       .replace(/\s+/g, '');
            
            this.speak(`I detected the email address ${normalizedEmail}. Would you like to compose an email to this address or search for emails from them?`);
            this.addToHistory(`Email mentioned: ${normalizedEmail}`, "Prompting for action");
            
            this.recognition.start();
        }

        async handleOpenEmailFromCommand(email) {
            const normalizedEmail = email.replace(/\s*(at|and)\s*/gi, '@')
                                       .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                       .replace(/\s+/g, '');
            
            const messageId = await this.findMessageIdBySender(normalizedEmail);
            if (messageId) {
                await this.readFullEmail(messageId);
                this.addToHistory(`Read email from ${normalizedEmail}`, "Email read aloud");
            } else {
                this.speak(`Could not find an email from ${normalizedEmail}`);
                this.addToHistory(`Read email from ${normalizedEmail}`, "No email found");
            }
        }

        async handleReplyCommand(target) {
            const extractedTarget = this.containsEmail(target) || target;
            const normalizedTarget = extractedTarget.replace(/\s*(at|and)\s*/gi, '@')
                                                  .replace(/\s*(dot|doht|dought)\s*/gi, '.')
                                                  .replace(/\s+/g, '');
            
            if (normalizedTarget.includes('@')) {
                const messageId = await this.findMessageIdBySender(normalizedTarget);
                if (messageId) {
                    window.open(`https://mail.google.com/mail/u/0/#inbox?compose=new&messageId=${messageId}`, "_self");
                    this.speak(`Opening reply to email from ${normalizedTarget}`);
                    this.addToHistory(`Reply to email from ${normalizedTarget}`, "Opened reply interface");
                } else {
                    this.speak(`Could not find an email from ${normalizedTarget}. Would you like to compose a new email to them?`);
                    this.addToHistory(`Reply to email from ${normalizedTarget}`, "No email found");
                }
            } else {
                const messageId = await this.findMessageIdByPosition(normalizedTarget);
                if (messageId) {
                    window.open(`https://mail.google.com/mail/u/0/#inbox?compose=new&messageId=${messageId}`, "_self");
                    this.speak(`Opening reply to the ${normalizedTarget} email`);
                    this.addToHistory(`Reply to ${normalizedTarget} email`, "Opened reply interface");
                } else {
                    this.speak(`Could not find the ${normalizedTarget} email`);
                    this.addToHistory(`Reply to ${normalizedTarget} email`, "No email found");
                }
            }
        }

        async handleSendCommand(to, subject, body) {
            await this.sendEmail(to, subject, body);
        }

        async handleDeleteCommand(position, folder) {
            const messageId = await this.findMessageIdByPositionAndFolder(position, folder);
            if (messageId) {
                await this.deleteEmail(messageId);
                this.speak(`Deleted the ${position} email in ${folder}`);
                this.addToHistory(`Delete ${position} email in ${folder}`, "Email deleted");
            } else {
                this.speak(`Could not find the ${position} email in ${folder}`);
                this.addToHistory(`Delete ${position} email in ${folder}`, "No email found");
            }
        }

        async handleMarkStatusCommand(filter, status, folder) {
            if (filter === 'all') {
                await this.markAllEmailsInFolder(folder, status === 'read');
                this.speak(`Marked all emails in ${folder} as ${status}`);
                this.addToHistory(`Mark all emails in ${folder} as ${status}`, "Status updated");
            } else {
                const messageId = await this.findMessageIdByPositionAndFolder(filter, folder);
                if (messageId) {
                    await this.markAsRead(messageId, status === 'read');
                    this.speak(`Marked the ${filter} email in ${folder} as ${status}`);
                    this.addToHistory(`Mark ${filter} email in ${folder} as ${status}`, "Status updated");
                } else {
                    this.speak(`Could not find the ${filter} email in ${folder}`);
                    this.addToHistory(`Mark ${filter} email in ${folder} as ${status}`, "No email found");
                }
            }
        }

        async handleReadEmailCommand(position, folder) {
            const messageId = await this.findMessageIdByPositionAndFolder(position, folder);
            if (messageId) {
                await this.readFullEmail(messageId);
                this.addToHistory(`Read ${position} email in ${folder}`, "Email read aloud");
            } else {
                this.speak(`Could not find the ${position} email in ${folder}`);
                this.addToHistory(`Read ${position} email in ${folder}`, "No email found");
            }
        }

        async executeEnhancedCommand(parsedCommand) {
            try {
                if (!parsedCommand) {
                    throw new Error("I didn't understand that command. Please try again.");
                }

                if (!this.isOnline) {
                    throw new Error("No internet connection available. Please check your network.");
                }

                await this.ensureValidToken();

                switch (parsedCommand.action) {
                    case 'reply':
                        await this.handleReplyCommand(parsedCommand.target);
                        break;
                    case 'send':
                        await this.handleSendCommand(parsedCommand.to, parsedCommand.subject, parsedCommand.body);
                        break;
                    case 'delete':
                        await this.handleDeleteCommand(parsedCommand.position, parsedCommand.folder);
                        break;
                    case 'markStatus':
                        await this.handleMarkStatusCommand(parsedCommand.filter, parsedCommand.status, parsedCommand.folder);
                        break;
                    case 'readEmail':
                        await this.handleReadEmailCommand(parsedCommand.position, parsedCommand.folder);
                        break;
                    case 'openEmailFrom':
                        await this.handleOpenEmailFromCommand(parsedCommand.email);
                        break;
                    case 'handleEmailAddress':
                        await this.handleEmailAddressCommand(parsedCommand.email);
                        break;
                    default:
                        throw new Error("I don't know how to handle that command yet.");
                }
            } catch (error) {
                console.error("Command execution error:", error);
                
                let errorMessage = error.message;
                
                if (error.message.includes("Too many requests")) {
                    errorMessage = error.message;
                } else if (error.message.includes("Authentication")) {
                    errorMessage = "Please log in to continue.";
                } else if (!this.isOnline) {
                    errorMessage = "No internet connection available.";
                } else if (error.name === "AbortError") {
                    errorMessage = "Request timed out. Please try again.";
                }
                
                this.speak(`Error: ${errorMessage}`);
                this.addToHistory("Command failed", errorMessage);
                
                if (!this.isOnline || error.name === "AbortError") {
                    this.speak("You can try again when you're back online.");
                }
            }
        }

        executeCommand(transcript) {
            let now = Date.now();
            
            if (now - this.lastCommandTime < 3000) return;
            this.lastCommandTime = now;

            const parsedCommand = this.parseCommand(transcript);
            if (parsedCommand) {
                this.executeEnhancedCommand(parsedCommand);
                return;
            }

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
                    this.showPopup("Redirecting to login...", "PROCESSING");
                    this.speak("Redirecting to login page");
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                    this.startAuthFlow();
                    this.addToHistory("Login", "Redirecting to login page");
                    return;
                }

                if (matchedCommand === "readEmails") {
                    this.fetchEmails();
                    this.addToHistory("Read emails", "Fetching emails");
                    return;
                }

                this.showPopup(`Opening ${matchedCommand}...`, "PROCESSING");
                this.speak(`Opening ${matchedCommand}`);
                window.open(urls[matchedCommand], "_self");
                this.addToHistory(`Open ${matchedCommand}`, "Navigating to section");
                return;
            }

            let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
            let randomResponse = responses[Math.floor(Math.random() * responses.length)];
            this.showPopup(randomResponse, "ERROR");
            this.speak(randomResponse);
            this.addToHistory(transcript, "Command not recognized");
        }

        // Cleanup
        cleanup() {
            this.cleanupFunctions.forEach(fn => fn());
            window.speechSynthesis.cancel();
            if (this.recognition) this.recognition.abort();
            if (this.popup?.parentNode) document.body.removeChild(this.popup);
            if (this.micIndicator?.parentNode) document.body.removeChild(this.micIndicator);
            if (this.commandHistory?.parentNode) document.body.removeChild(this.commandHistory);
            if (this.loginButton?.parentNode) document.body.removeChild(this.loginButton);
        }
    }

    try {
        const assistant = new VoiceEmailAssistant();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => assistant.cleanup());
    } catch (error) {
        console.error("Failed to initialize voice email assistant:", error);
        alert("Failed to initialize voice email assistant. Please check the console for details.");
    }
}