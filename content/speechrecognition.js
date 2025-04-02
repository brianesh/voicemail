if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false;
    let wakeWordDetected = false;
    let isListening = false;
    let lastCommandTime = 0;
    let isAuthenticated = false;
    let awaitingAuthResponse = false;

    // OAuth Configuration - Using environment variables
    const OAUTH_CONFIG = {
        clientId: process.env.GOOGLE_CLIENT_ID || '629991621617-u5vp7bh2dm1vd36u2laeppdjt74uc56h.apps.googleusercontent.com',
        redirectUri: process.env.REDIRECT_URI || 'http://localhost:8080/callback',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'http://localhost:8080/auth/callback' // Using local server endpoint
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
        isAuthenticated = !!accessToken;
        return isAuthenticated;
    }

    async function getAccessToken() {
        let accessToken = localStorage.getItem("access_token");
        let refreshToken = localStorage.getItem("refresh_token");

        if (!accessToken) {
            console.error("Access token is missing.");
            speak("Please log in to access emails.");
            return null;
        }

        try {
            const response = await fetch("http://localhost:8080/api/verify-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: accessToken })
            });
            const data = await response.json();

            if (!data.valid) {
                console.warn("Access token expired. Attempting to refresh...");
                return await refreshAccessToken(refreshToken);
            }

            return accessToken;
        } catch (error) {
            console.error("Error verifying token:", error);
            return null;
        }
    }

    async function refreshAccessToken(refreshToken) {
        if (!refreshToken) {
            console.error("No refresh token available. Please log in again.");
            speak("Your session expired. Please log in again.");
            return null;
        }

        try {
            const response = await fetch(OAUTH_CONFIG.tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            const data = await response.json();

            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                console.log("Access token refreshed successfully.");
                return data.access_token;
            } else {
                console.error("Failed to refresh token:", data);
                speak("Unable to refresh access. Please log in again.");
                return null;
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
            return null;
        }
    }

    function initiateOAuthLogin() {
        fetch('http://localhost:8080/auth/url')
            .then(res => res.json())
            .then(({ authUrl }) => {
                window.location.href = authUrl;
            })
            .catch(error => {
                console.error("Failed to get auth URL:", error);
                speak("Failed to start login process.");
            });
    }

    async function fetchEmails() {
        if (!checkAuthStatus()) {
            speak("Please log in first by saying 'login'");
            return;
        }

        let accessToken = await getAccessToken();
        if (!accessToken) return;

        try {
            const response = await fetch(`http://localhost:8080/api/emails?token=${encodeURIComponent(accessToken)}`);
            const { emails, error } = await response.json();

            if (error) throw new Error(error);
            if (!emails || emails.length === 0) {
                speak("You have no new emails.");
                showPopup("No new emails", "INFO");
                return;
            }

            for (const email of emails.slice(0, 3)) {
                let message = `Email from ${email.from}. Subject: ${email.subject}`;
                speak(message);
                showPopup(message, "EMAIL");
            }
        } catch (error) {
            console.error("Error fetching emails:", error);
            speak("Sorry, I couldn't fetch your emails.");
            showPopup("Error fetching emails", "ERROR");
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
                initiateOAuthLogin();
                return;
            }

            if (matchedCommand === "readEmails") {
                if (!checkAuthStatus()) {
                    speak("Please log in first by saying 'login'");
                    return;
                }
                showPopup("Fetching your latest emails...", "PROCESSING");
                speak("Fetching your latest emails...");
                fetchEmails();
                return;
            }

            showPopup(`Opening ${matchedCommand}...`, "PROCESSING");
            speak(`Opening ${matchedCommand}`);

            setTimeout(() => {
                window.open(urls[matchedCommand], "_self");
            }, 1500);
            return;
        }

        let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
        let randomResponse = responses[Math.floor(Math.random() * responses.length)];
        showPopup(randomResponse, "ERROR");
        speak(randomResponse);
    }

    // Handle OAuth callback when returning from Google auth
    function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
            console.error('OAuth error:', error);
            speak("Login failed. Please try again.");
            return;
        }

        if (code) {
            showPopup("Completing authentication...", "PROCESSING");
            speak("Completing your login...");

            fetch('http://localhost:8080/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            })
            .then(response => response.json())
            .then(data => {
                if (data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    isAuthenticated = true;
                    speak("Login successful. How can I help you?");
                    showPopup("Login successful", "AUTHENTICATED");
                    
                    // Clear the code from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    throw new Error('No tokens received');
                }
            })
            .catch(error => {
                console.error('Login failed:', error);
                speak("Login failed. Please try again.");
                showPopup("Login failed", "ERROR");
            });
        }
    }

    // Check for OAuth callback when page loads
    if (window.location.search.includes('code=')) {
        handleOAuthCallback();
    }

    // Start listening immediately when the page loads
    recognition.start();
    
    recognition.onstart = () => {
        isListening = true;
        showPopup("Listening...", "ON");
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