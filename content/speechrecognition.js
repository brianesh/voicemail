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
        redirectUri: window.location.origin, // Must match your registered URI
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
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

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }

    function checkAuthStatus() {
        const accessToken = localStorage.getItem("access_token");
        const expiresAt = localStorage.getItem("expires_at");
        isAuthenticated = !!accessToken && new Date().getTime() < expiresAt;
        return isAuthenticated;
    }

    function initiateOAuthLogin() {
        // First verify the redirect URI
        console.log("Using redirect URI:", OAUTH_CONFIG.redirectUri);
        
        // Store where to redirect after auth
        sessionStorage.setItem('postAuthRedirect', 'https://mail.google.com/mail/u/0/#inbox');
        
        const params = new URLSearchParams({
            client_id: OAUTH_CONFIG.clientId,
            redirect_uri: OAUTH_CONFIG.redirectUri,
            response_type: 'token',
            scope: OAUTH_CONFIG.scope,
            prompt: 'consent'
        });

        window.location.href = `${OAUTH_CONFIG.authUrl}?${params.toString()}`;
    }

    function handleOAuthResponse() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error');

        if (error) {
            console.error('OAuth error:', error);
            speak("Login failed. Please try again.");
            return;
        }

        if (accessToken) {
            const expiresAt = new Date().getTime() + (expiresIn * 1000);
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('expires_at', expiresAt);
            isAuthenticated = true;
            
            // Redirect to Gmail after auth
            const redirectUrl = sessionStorage.getItem('postAuthRedirect') || 'https://mail.google.com';
            window.location.href = redirectUrl;
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

    function executeCommand(transcript) {
        let lowerTranscript = transcript.toLowerCase().trim();

        const commands = {
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

        let matchedCommand = Object.keys(commands).find(command =>
            commands[command].some(phrase => lowerTranscript.includes(phrase))
        );

        if (matchedCommand) {
            let now = Date.now();
            if (now - lastCommandTime < 3000) return;

            lastCommandTime = now;

            if (matchedCommand === "login") {
                showPopup("Redirecting to login...", "PROCESSING");
                speak("Redirecting to login page");
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
                initiateOAuthLogin();
                return;
            }

            if (matchedCommand === "readEmails") {
                if (!checkAuthStatus()) {
                    speak("Please log in first by saying 'login'");
                    return;
                }
                fetchEmails();
                return;
            }

            showPopup(`Opening ${matchedCommand}...`, "PROCESSING");
            speak(`Opening ${matchedCommand}`);
            window.open(urls[matchedCommand], "_self");
            return;
        }

        let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
        let randomResponse = responses[Math.floor(Math.random() * responses.length)];
        showPopup(randomResponse, "ERROR");
        speak(randomResponse);
    }

    // Start listening immediately when the page loads
    recognition.start();
    
    recognition.onstart = () => {
        isListening = true;
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
            return;
        }

        if (sleepCommands.some(word => transcript.includes(word))) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speak("Voice control deactivated. Say 'Hey email' to reactivate.");
            return;
        }

        if (isActive) {
            executeCommand(transcript);
        }
    };

    recognition.onend = () => {
        isListening = false;
        if (wakeWordDetected || !isActive) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    // Check auth status on page load
    checkAuthStatus();
}