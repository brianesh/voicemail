function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Listening...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized command:", command);

        if (command.includes("open inbox")) {
            speakAndOpen("Opening inbox", "inbox");
        } else if (command.includes("open sent")) {
            speakAndOpen("Opening sent emails", "sent");
        } else if (command.includes("open snoozed")) {
            speakAndOpen("Opening snoozed emails", "snoozed");
        } else if (command.includes("open starred")) {
            speakAndOpen("Opening starred emails", "starred");
        } else {
            speak("Sorry, I didn't understand that command.");
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening. Restarting...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
        setTimeout(() => recognition.start(), 1000);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
}

function speakAndOpen(message, section) {
    speak(message);
    setTimeout(() => openGmailSection(section), 1500);
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
    console.log("Speaking:", text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}
