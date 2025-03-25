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
        }, 3000);
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }

    function executeCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase();

        const commandMappings = {
            "compose": ["compose", "new email", "write email"],
            "inbox": ["inbox", "open inbox", "go to inbox", "check inbox"],
            "sent": ["sent", "sent mail", "sent messages"],
            "drafts": ["drafts", "draft", "saved emails"],
            "starred": ["starred", "important emails"],
            "snoozed": ["snoozed", "snooze emails"],
            "spam": ["spam", "junk mail"],
            "trash": ["trash", "deleted emails"],
            "all mail": ["all mail", "all messages"],
            "important": ["important", "priority emails"]
        };

        const urlMappings = {
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

        for (let command in commandMappings) {
            if (commandMappings[command].some(phrase => lowerTranscript.includes(phrase))) {
                matchedCommand = command;
                break;
            }
        }

        if (matchedCommand) {
            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);
            setTimeout(() => {
                window.open(urlMappings[matchedCommand], "_self");
            }, 1500);
        } else {
            let responses = [
                "I didn't catch that. Could you try again?",
                "Hmm, I'm not sure what you meant. Can you say it differently?",
                "I didn't understand. Try saying the command more clearly."
            ];
            let randomResponse = responses[Math.floor(Math.random() * responses.length)];
            showPopup(randomResponse, "Error");
            speak(randomResponse);
        }
    }

    recognition.onstart = () => {
        isListening = true;
        console.log("Listening...");
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
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

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showPopup("Error detected", "Error");

        if (event.error === "no-speech" || event.error === "audio-capture") {
            console.warn("No speech detected. Restarting recognition...");
            isListening = false;
            setTimeout(() => {
                if (!isListening) startRecognition();
            }, 2000);
        }
    };

    recognition.onend = () => {
        isListening = false;
        console.log("Stopped listening.");
        showPopup("Not listening...", "OFF");

        if (wakeWordDetected) {
            setTimeout(() => {
                if (!isListening) startRecognition();
            }, 1000);
        }
    };

    function startRecognition() {
        if (!isListening) {
            recognition.start();
        }
    }

    startRecognition();
}
