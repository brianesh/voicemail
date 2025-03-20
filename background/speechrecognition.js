function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Listening...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let command = event.results[0][0].transcript.toLowerCase().trim();
        console.log("You said:", command);

        if (command.includes("open inbox")) {
            speak("Opening inbox");
            openGmailSection("inbox");
        } else if (command.includes("open sent")) {
            speak("Opening sent emails");
            openGmailSection("sent");
        } else if (command.includes("open snoozed")) {
            speak("Opening snoozed emails");
            openGmailSection("snoozed");
        } else if (command.includes("open starred")) {
            speak("Opening starred emails");
            openGmailSection("starred");
        } else {
            speak("I didn't understand that command.");
            console.log("Unknown command:", command);
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
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
