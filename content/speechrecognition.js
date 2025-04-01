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
    let isAuthenticated = false; // Variable to track authentication
    const password = "fish"; // Voice password for authentication

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

    async function getAccessToken() {
        let accessToken = localStorage.getItem("access_token");
        let refreshToken = localStorage.getItem("refresh_token");

        if (!accessToken) {
            console.error("Access token is missing.");
            speak("Please log in to access emails.");
            return null;
        }

        // Verify if the token is still valid
        try {
            const response = await fetch("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + accessToken);
            const data = await response.json();

            if (data.error) {
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
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: "YOUR_CLIENT_ID",
                    client_secret: "YOUR_CLIENT_SECRET",
                    refresh_token: refreshToken,
                    grant_type: "refresh_token"
                }),
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

    async function fetchEmails() {
        let accessToken = await getAccessToken();
        if (!accessToken) return;

        try {
            const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                }
            });

            const data = await response.json();
            if (!data.messages) {
                speak("You have no new emails.");
                showPopup("No new emails", "INFO");
                return;
            }

            for (const email of data.messages.slice(0, 3)) {
                const emailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/json",
                    }
                });

                const emailData = await emailResponse.json();
                const headers = emailData.payload.headers;
                const subject = headers.find(header => header.name === "Subject")?.value || "No Subject";
                const from = headers.find(header => header.name === "From")?.value || "Unknown Sender";

                let message = `Email from ${from}. Subject: ${subject}`;
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
            "readEmails": ["read my emails", "read my email", "read latest emails", "check my emails", "show unread emails"]
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
            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);

            if (matchedCommand === "readEmails") {
                showPopup("Fetching your latest emails...", "PROCESSING");
                speak("Fetching your latest emails...");
                fetchEmails();
                return;
            }

            setTimeout(() => {
                window.open(urls[matchedCommand], "_self");
            }, 1500);
            return;
        }

        let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
        let randomResponse = responses[Math.floor(Math.random() * responses.length)];
        showPopup(randomResponse, "Error");
        speak(randomResponse);
    }

    function authenticateUser(command) {
        if (command.includes("password") || command.includes("login") || command.includes("authenticate")) {
            speak("Please say your password now.");
            showPopup("Listening for password...", "AUTHENTICATION");
    
            recognition.stop(); // Stop the current recognition first
    
            setTimeout(() => {
                recognition.start(); // Restart recognition to capture the password
    
                recognition.onresult = (event) => {
                    let result = event.results[event.results.length - 1][0];
                    let spokenPassword = result.transcript.trim().toLowerCase();
    
                    if (spokenPassword === password.toLowerCase()) {
                        isAuthenticated = true;
                        speak("Authentication successful. How can I assist you?");
                        showPopup("Authenticated successfully", "AUTHENTICATED");
                    } else {
                        speak("Incorrect password. Please try again.");
                        showPopup("Incorrect password", "AUTHENTICATION ERROR");
                    }
    
                    // Restart recognition for normal commands after authentication
                    recognition.start();
                };
            }, 1000); // Delay to ensure recognition properly restarts
        }
    }    

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
        let authCommand = ["password", "login", "authenticate"];

        if (authCommand.some(word => transcript.includes(word))) {
            authenticateUser(transcript);
            return;
        }

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
        if (wakeWordDetected) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    recognition.start();
}
