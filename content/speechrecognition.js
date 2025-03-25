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
    let composeMode = false;
    let emailDetails = { to: "", subject: "", body: "" };

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
            "important": ["important", "priority emails"]
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

        let matchedCommand = null;
        for (let command in commands) {
            if (commands[command].some(phrase => lowerTranscript.includes(phrase))) {
                matchedCommand = command;
                break;
            }
        }

        if (matchedCommand) {
            lastCommandTime = Date.now();
            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);

            if (matchedCommand === "compose") {
                composeMode = true;
                setTimeout(() => {
                    window.open(urls[matchedCommand], "_self");
                }, 1500);

                setTimeout(() => {
                    guideUserToCompose();
                }, 4000); // Wait for Gmail to load
            } else {
                window.open(urls[matchedCommand], "_self");
            }
        } else {
            let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
            let randomResponse = responses[Math.floor(Math.random() * responses.length)];
            showPopup(randomResponse, "Error");
            speak(randomResponse);
        }
    }

    function guideUserToCompose() {
        speak("Who do you want to send the email to?");
        recognition.start();
    }

    function handleCompose(transcript) {
        if (!emailDetails.to) {
            emailDetails.to = transcript;
            showPopup(`Recipient: ${emailDetails.to}`, "Next Step");
            speak("What is the subject of the email?");
            return;
        }

        if (!emailDetails.subject) {
            emailDetails.subject = transcript;
            showPopup(`Subject: ${emailDetails.subject}`, "Next Step");
            speak("What is the message?");
            return;
        }

        if (!emailDetails.body) {
            emailDetails.body = transcript;
            showPopup(`Message: ${emailDetails.body}`, "Filling Email");
            fillComposeFields();
            return;
        }
    }

    function fillComposeFields() {
        let composeFields = setInterval(() => {
            let toField = document.querySelector("textarea[name='to']");
            let subjectField = document.querySelector("input[name='subjectbox']");
            let bodyField = document.querySelector("div[aria-label='Message Body']");

            if (toField && subjectField && bodyField) {
                toField.value = emailDetails.to;
                subjectField.value = emailDetails.subject;
                bodyField.innerHTML = emailDetails.body;
                speak("Your email is ready. Say 'send email' to send.");
                clearInterval(composeFields);
            }
        }, 1000);
    }

    recognition.onresult = (event) => {
        let result = event.results[event.results.length - 1][0];
        let transcript = result.transcript.trim().toLowerCase();
        let confidence = result.confidence;

        if (confidence < 0.7) return;

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
            if (composeMode) {
                handleCompose(transcript);
            } else {
                executeCommand(transcript);
            }
        }
    };

    recognition.start();
}
