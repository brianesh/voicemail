// Voice Email Assistant - Improved Version
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
            this.recognition.start();
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

            // OAuth Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
            this.OAUTH_CONFIG = {
                clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
                clientSecret: 'YOUR_CLIENT_SECRET',
                redirectUri: this.getRedirectUri(),
                scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token'
            };

            // Verify OAuth configuration
            if (!this.OAUTH_CONFIG.clientId || this.OAUTH_CONFIG.clientId.includes('YOUR_CLIENT_ID')) {
                console.error("OAuth configuration is incomplete");
                this.showPopup("Configuration error", "ERROR");
                this.speak("This application is not properly configured. Please contact support.");
                return;
            }

            // Initialize the app
            this.initUI();
            this.initEventListeners();
            this.initRecognition();
            this.checkAuthStatus();

            // Handle OAuth response if we're in the callback
            if (window.location.search.includes('code=')) {
                this.handleOAuthResponse();
            }
        }

        // Helper method to determine redirect URI
        getRedirectUri() {
            if (window.location.href.includes('mail.google.com')) {
                return window.location.href.split('?')[0];
            }
            return window.location.origin || 'http://localhost';
        }

        // Initialization methods
        initUI() {
            // Create UI elements only if they don't exist
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

            // Add a login button
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
                
                // Try restarting after error with a delay
                setTimeout(() => {
                    try {
                        if (this.recognition) {
                            this.recognition.stop();
                            setTimeout(() => this.recognition.start(), 500);
                        }
                    } catch (e) {
                        console.error('Error restarting recognition:', e);
                    }
                }, 1000);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.micIndicator.style.background = "red";
                if (this.wakeWordDetected || !this.isActive) {
                    setTimeout(() => {
                        try {
                            if (this.recognition) {
                                this.recognition.start();
                            }
                        } catch (e) {
                            console.error('Error restarting recognition:', e);
                        }
                    }, 1000);
                }
            };

            // Start recognition with error handling
            try {
                this.recognition.start();
            } catch (e) {
                console.error('Initial recognition start failed:', e);
                setTimeout(() => this.recognition.start(), 1000);
            }
        }

        // Authentication Functions
        checkAuthStatus() {
            const token = localStorage.getItem('access_token');
            const expiresAt = localStorage.getItem('expires_at');
            const isExpired = expiresAt && (Date.now() > parseInt(expiresAt));
            
            if (token && !isExpired) {
                this.isAuthenticated = true;
                if (document.getElementById('login-button')) {
                    document.getElementById('login-button').style.display = 'none';
                }
                return true;
            } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                localStorage.removeItem('refresh_token');
                this.isAuthenticated = false;
                if (document.getElementById('login-button')) {
                    document.getElementById('login-button').style.display = 'block';
                }
                return false;
            }
        }

        async ensureValidToken() {
            if (this.checkAuthStatus()) {
                return localStorage.getItem('access_token');
            }
            
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await fetch(this.OAUTH_CONFIG.tokenUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            client_id: this.OAUTH_CONFIG.clientId,
                            client_secret: this.OAUTH_CONFIG.clientSecret,
                            refresh_token: refreshToken,
                            grant_type: 'refresh_token'
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Refresh failed with status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);
                    
                    const expiresAt = new Date().getTime() + (data.expires_in * 1000);
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('expires_at', expiresAt);
                    
                    if (data.refresh_token) {
                        localStorage.setItem('refresh_token', data.refresh_token);
                    }
                    
                    this.isAuthenticated = true;
                    if (document.getElementById('login-button')) {
                        document.getElementById('login-button').style.display = 'none';
                    }
                    return data.access_token;
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                    localStorage.removeItem('refresh_token');
                    this.isAuthenticated = false;
                    if (document.getElementById('login-button')) {
                        document.getElementById('login-button').style.display = 'block';
                    }
                    
                    await this.startAuthFlow();
                    throw new Error("Authentication required. Please log in.");
                }
            }
            
            await this.startAuthFlow();
            throw new Error("Authentication required. Please log in.");
        }

        startAuthFlow() {
            const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
            sessionStorage.setItem('oauth_state', state);
            sessionStorage.setItem('postAuthRedirect', window.location.href);
            
            const params = new URLSearchParams({
                client_id: this.OAUTH_CONFIG.clientId,
                redirect_uri: this.OAUTH_CONFIG.redirectUri,
                response_type: 'code',
                scope: this.OAUTH_CONFIG.scope,
                state: state,
                access_type: 'offline',
                prompt: 'consent'
            });

            window.location.href = `${this.OAUTH_CONFIG.authUrl}?${params.toString()}`;
        }

        async handleOAuthResponse() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            if (error) {
                console.error('OAuth error:', error, errorDescription);
                this.speak(`Login failed: ${errorDescription || error}. Please try again.`);
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                localStorage.removeItem('refresh_token');
                window.location.href = window.location.origin;
                return;
            }

            const storedState = sessionStorage.getItem('oauth_state');
            if (state !== storedState) {
                console.error('State mismatch - possible CSRF attack');
                this.speak("Login failed due to security error. Please try again.");
                window.location.href = window.location.origin;
                return;
            }
            sessionStorage.removeItem('oauth_state');

            if (code) {
                try {
                    const response = await fetch(this.OAUTH_CONFIG.tokenUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            code: code,
                            client_id: this.OAUTH_CONFIG.clientId,
                            client_secret: this.OAUTH_CONFIG.clientSecret,
                            redirect_uri: this.OAUTH_CONFIG.redirectUri,
                            grant_type: 'authorization_code'
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Token exchange failed with status ${response.status}`);
                    }

                    const data = await response.json();
                    if (data.error) throw new Error(data.error);

                    const expiresAt = new Date().getTime() + (data.expires_in * 1000);
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('expires_at', expiresAt);
                    
                    if (data.refresh_token) {
                        localStorage.setItem('refresh_token', data.refresh_token);
                    }
                    
                    this.isAuthenticated = true;
                    if (document.getElementById('login-button')) {
                        document.getElementById('login-button').style.display = 'none';
                    }

                    // Redirect back to main page or Gmail
                    const redirectUrl = sessionStorage.getItem('postAuthRedirect') || 
                                      'https://mail.google.com/mail/u/0/#inbox';
                    window.location.href = redirectUrl;
                } catch (error) {
                    console.error('Token exchange failed:', error);
                    this.speak("Login failed. Please try again.");
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('expires_at');
                    localStorage.removeItem('refresh_token');
                    window.location.href = window.location.origin;
                }
            }
        }

        // UI Functions
        showPopup(message, status) {
            if (!this.popup) return;
            
            this.popup.textContent = message;
            this.popup.style.display = "block";
            
            // Set color based on status
            switch(status) {
                case "ON":
                case "ACTIVE":
                    this.popup.style.backgroundColor = "rgba(0, 128, 0, 0.9)";
                    break;
                case "OFF":
                case "SLEEP":
                    this.popup.style.backgroundColor = "rgba(128, 128, 128, 0.9)";
                    break;
                case "ERROR":
                    this.popup.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
                    break;
                case "ONLINE":
                    this.popup.style.backgroundColor = "rgba(0, 0, 255, 0.9)";
                    break;
                case "OFFLINE":
                    this.popup.style.backgroundColor = "rgba(255, 165, 0, 0.9)";
                    break;
                default:
                    this.popup.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
            }
            
            // Auto-hide after 3 seconds
            clearTimeout(this.popupTimeout);
            this.popupTimeout = setTimeout(() => {
                this.popup.style.display = "none";
            }, 3000);
        }

        addToHistory(command, response) {
            if (!this.commandHistory) return;
            
            this.commandHistory.style.display = "block";
            const entry = document.createElement("div");
            entry.innerHTML = `<strong>${command}:</strong> ${response}`;
            entry.style.marginBottom = "5px";
            this.commandHistory.appendChild(entry);
            
            // Scroll to bottom
            this.commandHistory.scrollTop = this.commandHistory.scrollHeight;
            
            // Show for 10 seconds
            clearTimeout(this.historyTimeout);
            this.historyTimeout = setTimeout(() => {
                this.commandHistory.style.display = "none";
            }, 10000);
        }

        // Speech Functions
        speak(text) {
            if (!text || !window.speechSynthesis) return;
            
            // Add to queue
            this.speechQueue.push(text);
            
            // If not currently speaking, start processing the queue
            if (!this.isSpeaking) {
                this.processSpeechQueue();
            }
        }

        processSpeechQueue() {
            if (this.speechQueue.length === 0) {
                this.isSpeaking = false;
                return;
            }
            
            this.isSpeaking = true;
            const text = this.speechQueue.shift();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = () => {
                setTimeout(() => this.processSpeechQueue(), 500);
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                setTimeout(() => this.processSpeechQueue(), 500);
            };
            
            window.speechSynthesis.speak(utterance);
        }

        // Command Execution
        async executeCommand(command) {
            if (!this.isOnline) {
                this.showPopup("No internet connection", "OFFLINE");
                this.speak("I can't perform this action while offline. Please check your internet connection.");
                return;
            }
            
            try {
                this.addToHistory("Command", command);
                
                // Check rate limiting
                const now = Date.now();
                this.apiCallTimestamps = this.apiCallTimestamps.filter(timestamp => 
                    now - timestamp < 60000
                );
                
                if (this.apiCallTimestamps.length >= this.API_RATE_LIMIT) {
                    this.showPopup("Too many requests. Please wait.", "ERROR");
                    this.speak("I'm getting too many requests. Please wait a minute before trying again.");
                    return;
                }
                
                this.apiCallTimestamps.push(now);
                
                // Process command
                const lowerCommand = command.toLowerCase();
                
                if (lowerCommand.includes("read email") || lowerCommand.includes("check email")) {
                    await this.readEmails();
                } else if (lowerCommand.includes("send email") || lowerCommand.includes("compose email")) {
                    await this.composeEmail(command);
                } else if (lowerCommand.includes("reply") || lowerCommand.includes("respond")) {
                    await this.replyToEmail(command);
                } else if (lowerCommand.includes("delete email") || lowerCommand.includes("trash email")) {
                    await this.deleteEmail(command);
                } else if (lowerCommand.includes("mark as read") || lowerCommand.includes("mark read")) {
                    await this.markAsRead(command);
                } else if (lowerCommand.includes("mark as unread") || lowerCommand.includes("mark unread")) {
                    await this.markAsUnread(command);
                } else if (lowerCommand.includes("help") || lowerCommand.includes("what can you do")) {
                    this.showHelp();
                } else {
                    this.showPopup("Command not recognized", "ERROR");
                    this.speak("I didn't understand that command. Please try again or say help for a list of commands.");
                }
            } catch (error) {
                console.error("Command execution error:", error);
                this.showPopup(`Error: ${error.message}`, "ERROR");
                this.speak(`Sorry, I encountered an error: ${error.message}`);
            }
        }

        // Email Operations
        async readEmails() {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Checking for new emails...", "ON");
                this.speak("Checking your inbox for new emails.");
                
                const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5", {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch emails: ${response.status}`);
                }
                
                const data = await response.json();
                if (!data.messages || data.messages.length === 0) {
                    this.showPopup("No new emails", "ON");
                    this.speak("You have no new emails in your inbox.");
                    return;
                }
                
                let unreadCount = 0;
                let latestSubject = "";
                let latestSender = "";
                
                // Get details for each message
                for (const message of data.messages.slice(0, 3)) {
                    const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!msgResponse.ok) continue;
                    
                    const msgData = await msgResponse.json();
                    const headers = msgData.payload.headers;
                    
                    const subjectHeader = headers.find(h => h.name === "Subject");
                    const fromHeader = headers.find(h => h.name === "From");
                    const isUnread = !msgData.labelIds.includes("READ");
                    
                    if (isUnread) unreadCount++;
                    
                    if (!latestSubject && subjectHeader) {
                        latestSubject = subjectHeader.value;
                    }
                    
                    if (!latestSender && fromHeader) {
                        latestSender = fromHeader.value.split("<")[0].trim();
                    }
                }
                
                if (unreadCount > 0) {
                    this.showPopup(`${unreadCount} new emails`, "ON");
                    this.speak(`You have ${unreadCount} new emails. The latest is from ${latestSender} about ${latestSubject}`);
                } else {
                    this.showPopup("No new emails", "ON");
                    this.speak("You have no new unread emails.");
                }
                
                this.addToHistory("Read emails", `Found ${unreadCount} unread emails`);
            } catch (error) {
                console.error("Error reading emails:", error);
                this.showPopup("Failed to read emails", "ERROR");
                this.speak("Sorry, I couldn't check your emails. Please try again.");
                throw error;
            }
        }

        async composeEmail(command) {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Preparing to compose email...", "ON");
                this.speak("I'll help you compose an email. Please say the recipient's email address.");
                
                // Extract email address from command if present
                let to = "";
                const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
                const matches = command.match(emailRegex);
                if (matches && matches.length > 0) {
                    to = matches[0];
                }
                
                // Extract subject if present
                let subject = "";
                if (command.includes("about")) {
                    subject = command.split("about")[1].trim();
                }
                
                if (to) {
                    this.speak(`I have ${to} as the recipient. What should the subject be?`);
                } else {
                    this.speak("Who should I send this email to? Please say the email address.");
                }
                
                // In a real implementation, you would collect more information here
                // For this example, we'll just show a popup
                this.showPopup("Email composition not fully implemented", "ON");
                this.speak("Email composition is not fully implemented in this demo version.");
                
                this.addToHistory("Compose email", "Initiated email composition");
            } catch (error) {
                console.error("Error composing email:", error);
                this.showPopup("Failed to compose email", "ERROR");
                this.speak("Sorry, I couldn't prepare to compose an email. Please try again.");
                throw error;
            }
        }

        async replyToEmail(command) {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Preparing to reply...", "ON");
                this.speak("I'll help you reply to an email. Please say your reply message.");
                
                // In a real implementation, you would identify which email to reply to
                // and collect the reply content
                this.showPopup("Reply not fully implemented", "ON");
                this.speak("Email reply is not fully implemented in this demo version.");
                
                this.addToHistory("Reply to email", "Initiated email reply");
            } catch (error) {
                console.error("Error replying to email:", error);
                this.showPopup("Failed to reply to email", "ERROR");
                this.speak("Sorry, I couldn't prepare to reply to an email. Please try again.");
                throw error;
            }
        }

        async deleteEmail(command) {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Preparing to delete email...", "ON");
                this.speak("I'll help you delete an email. Please confirm by saying 'yes'.");
                
                // In a real implementation, you would identify which email to delete
                this.showPopup("Delete not fully implemented", "ON");
                this.speak("Email deletion is not fully implemented in this demo version.");
                
                this.addToHistory("Delete email", "Initiated email deletion");
            } catch (error) {
                console.error("Error deleting email:", error);
                this.showPopup("Failed to delete email", "ERROR");
                this.speak("Sorry, I couldn't delete the email. Please try again.");
                throw error;
            }
        }

        async markAsRead(command) {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Marking email as read...", "ON");
                this.speak("I'll mark the email as read.");
                
                // In a real implementation, you would identify which email to mark
                this.showPopup("Mark as read not fully implemented", "ON");
                this.speak("Mark as read is not fully implemented in this demo version.");
                
                this.addToHistory("Mark as read", "Initiated mark as read");
            } catch (error) {
                console.error("Error marking email as read:", error);
                this.showPopup("Failed to mark email as read", "ERROR");
                this.speak("Sorry, I couldn't mark the email as read. Please try again.");
                throw error;
            }
        }

        async markAsUnread(command) {
            try {
                const token = await this.ensureValidToken();
                this.showPopup("Marking email as unread...", "ON");
                this.speak("I'll mark the email as unread.");
                
                // In a real implementation, you would identify which email to mark
                this.showPopup("Mark as unread not fully implemented", "ON");
                this.speak("Mark as unread is not fully implemented in this demo version.");
                
                this.addToHistory("Mark as unread", "Initiated mark as unread");
            } catch (error) {
                console.error("Error marking email as unread:", error);
                this.showPopup("Failed to mark email as unread", "ERROR");
                this.speak("Sorry, I couldn't mark the email as unread. Please try again.");
                throw error;
            }
        }

        showHelp() {
            const helpText = "I can help you with: reading emails, composing emails, replying to emails, deleting emails, and marking emails as read or unread.";
            this.showPopup(helpText, "ON");
            this.speak(helpText);
            this.addToHistory("Help", "Displayed help information");
        }

        // Cleanup
        cleanup() {
            this.cleanupFunctions.forEach(fn => fn());
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (this.recognition) {
                try {
                    this.recognition.abort();
                } catch (e) {
                    console.error('Error aborting recognition:', e);
                }
            }
            if (this.popup?.parentNode) {
                document.body.removeChild(this.popup);
            }
            if (this.micIndicator?.parentNode) {
                document.body.removeChild(this.micIndicator);
            }
            if (this.commandHistory?.parentNode) {
                document.body.removeChild(this.commandHistory);
            }
            if (this.loginButton?.parentNode) {
                document.body.removeChild(this.loginButton);
            }
        }
    }

    // Initialize the application after user interaction
    document.addEventListener('DOMContentLoaded', () => {
        // Add a start button to ensure user gesture
        if (!document.getElementById('start-assistant-btn')) {
            const startBtn = document.createElement('button');
            startBtn.id = 'start-assistant-btn';
            startBtn.textContent = 'Start Voice Assistant';
            startBtn.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                padding: 10px 15px;
                background: #34a853;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                z-index: 10002;
            `;
            document.body.appendChild(startBtn);
            
            startBtn.addEventListener('click', () => {
                try {
                    const assistant = new VoiceEmailAssistant();
                    startBtn.style.display = 'none';
                    
                    // Cleanup on page unload
                    window.addEventListener('beforeunload', () => assistant.cleanup());
                } catch (error) {
                    console.error("Failed to initialize voice email assistant:", error);
                    alert("Failed to initialize voice email assistant. Please check the console for details.");
                }
            });
        }
    });
}