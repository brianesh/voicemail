function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true; // Keeps listening after first command
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Listening...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("You said:", command);

        // Command Processing
        if (command.includes("open inbox")) {
            speakAndOpen("Opening inbox", "inbox");
        } else if (command.includes("open sent")) {
            speakAndOpen("Opening sent emails", "sent");
        } else if (command.includes("open snoozed")) {
            speakAndOpen("Opening snoozed emails", "snoozed");
        } else if (command.includes("open starred")) {
            speakAndOpen("Opening starred emails", "starred");
        } else {
            speak("Sorry, I didn't understand.");
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
        recognition.start(); // Restart listening automatically
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
}

function speakAndOpen(message, section) {
    speak(message);
    setTimeout(() => openGmailSection(section), 1000); // Small delay to let speech finish
}

function openGmailSection(section) {
    let url = `https://mail.google.com/mail/u/0/#${section}`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url });
        } else {
            chrome.tabs.create({ url });
        }
    });
}

// Text-to-Speech function
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}
