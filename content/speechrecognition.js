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

    function cleanEmail(transcript) {
        return transcript
            .replace(/\s*at\s*/g, "@")   // "bmngari21 at gmail.com" → "bmngari21@gmail.com"
            .replace(/\s*dot\s*/g, ".")  // "gmail dot com" → "gmail.com"
            .replace(/\s+/g, "");        // Remove extra spaces
    }

    function isValidEmail(email) {
        let emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailPattern.test(email);
    }

    function guideUserToCompose() {
        speak("Who do you want to send the email to?");
        recognition.start();
    }

    function handleCompose(transcript) {
        if (!emailDetails.to) {
            let cleanedEmail = cleanEmail(transcript);

            if (!isValidEmail(cleanedEmail)) {
                speak("I didn't understand the email address. Can you spell it out?");
                return;
            }

            emailDetails.to = cleanedEmail;
            showPopup(`Recipient: ${emailDetails.to}`, "Confirming");
            speak(`I heard ${emailDetails.to}. Is that correct? Say yes or no.`);
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
                recognition.start();
            }
        }, 1000);
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

        let matchedCommand = Object.keys(commands).find(command =>
            commands[command].some(phrase => lowerTranscript.includes(phrase))
        );

        if (matchedCommand) {
            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);

            if (matchedCommand === "compose") {
                composeMode = true;
                window.open(urls[matchedCommand], "_self");
                setTimeout(guideUserToCompose, 4000);
            } else {
                window.open(urls[matchedCommand], "_self");
            }
        } else {
            speak("I didn't catch that. Try again?");
        }
    }

    recognition.onresult = (event) => {
        let result = event.results[event.results.length - 1][0];
        let transcript = result.transcript.trim().toLowerCase();

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
            speak("Voice control deactivated.");
            return;
        }

        if (isActive) {
            if (composeMode) {
                handleCompose(transcript);
            } else {
                executeCommand(transcript);
            }
        }

        recognition.start();
    };

    recognition.onerror = () => recognition.start();
    recognition.start();
}
