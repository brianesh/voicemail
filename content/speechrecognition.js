if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false;
    let isListening = false;
    let lastCommandTime = 0;

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

    // 🔹 Function to Refresh Token
    async function refreshAccessToken() {
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) {
            console.error("Refresh token is missing.");
            speak("Authentication expired. Please log in again.");
            return;
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
                })
            });

            const data = await response.json();

            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                console.log("Access token refreshed!");
            } else {
                console.error("Failed to refresh token:", data);
                speak("Authentication error. Please log in.");
            }
        } catch (error) {
            console.error("Error refreshing access token:", error);
            speak("Error refreshing token.");
        }
    }

    // 🔹 Function to Fetch Unread Emails
    async function fetchEmails() {
        let accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            console.error("Access token is missing. Refreshing...");
            await refreshAccessToken();
            accessToken = localStorage.getItem('access_token');
        }

        try {
            const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread", {
                method: "GET",
                headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
            });

            if (response.status === 401) {
                console.warn("Access token expired. Refreshing...");
                await refreshAccessToken();
                accessToken = localStorage.getItem('access_token');
                return fetchEmails(); // Retry after refreshing token
            }

            const data = await response.json();
            if (!data.messages) {
                speak("You have no new emails.");
                showPopup("No new emails", "INFO");
                return;
            }

            const emailIds = data.messages.slice(0, 3).map(email => email.id); 

            for (const emailId of emailIds) {
                const emailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
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

    // 🔹 Function to Process Commands
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
            lastCommandTime = Date.now();
            if (matchedCommand === "readEmails") {
                showPopup("Fetching your latest emails...", "PROCESSING");
                speak("Fetching your latest emails...");
                fetchEmails();
                return;
            }

            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);
            setTimeout(() => {
                window.open(urls[matchedCommand], "_self");
            }, 1500);
        }
    }

    recognition.onstart = () => showPopup("Listening...", "ON");
    recognition.onresult = (event) => executeCommand(event.results[event.results.length - 1][0].transcript);
    recognition.onerror = () => setTimeout(() => recognition.start(), 2000);
    recognition.onend = () => setTimeout(() => recognition.start(), 1000);

    recognition.start();
}
