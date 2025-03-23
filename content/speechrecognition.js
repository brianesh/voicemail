if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isListening = true;
    let isActive = false;
    let wakeWordDetected = false;

    // Floating Popup UI
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.8);
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
        }, 4000);
    }

    function executeCommand(transcript) {
        let lowerTranscript = transcript.toLowerCase();
        const commands = {
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

        for (let keyword in commands) {
            if (lowerTranscript.includes(keyword)) {
                let utterance = new SpeechSynthesisUtterance(`Opening ${keyword}`);
                speechSynthesis.speak(utterance);
                showPopup(`Opening ${keyword}...`, "Processing");
                
                setTimeout(() => {
                    window.location.href = commands[keyword];
                }, 2000); // Delayed to allow speech to finish

                return;
            }
        }
    }

    recognition.onstart = () => {
        console.log("Listening...");
        isActive = true;
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim();
        console.log("You said:", transcript);

        showPopup(transcript, "ON");

        if (transcript.toLowerCase() === "hey email") {
            wakeWordDetected = true;
            let utterance = new SpeechSynthesisUtterance("Hello, how can I help you?");
            speechSynthesis.speak(utterance);
            return;
        }

        if (wakeWordDetected) {
            executeCommand(transcript);
            wakeWordDetected = false;
        }

        if (transcript.toLowerCase().includes("sleep email")) {
            let utterance = new SpeechSynthesisUtterance("Going to sleep.");
            speechSynthesis.speak(utterance);
            isListening = false;
            recognition.stop();
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        isActive = false;
        showPopup("Not listening...", "OFF");

        if (isListening) {
            setTimeout(() => {
                if (!isActive) {
                    recognition.start();
                }
            }, 1000);
        }
    };

    recognition.start();
}
