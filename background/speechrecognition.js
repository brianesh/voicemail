function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;  // Keeps listening even after a command
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Listening...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized command:", command);

        // Ensure command matching is case insensitive
        if (command.includes("open inbox")) {
            console.log("Opening Inbox...");
            speakAndOpen("Opening inbox", "inbox");
        } else if (command.includes("open sent")) {
            console.log("Opening Sent...");
            speakAndOpen("Opening sent emails", "sent");
        } else if (command.includes("open snoozed")) {
            console.log("Opening Snoozed...");
            speakAndOpen("Opening snoozed emails", "snoozed");
        } else if (command.includes("open starred")) {
            console.log("Opening Starred...");
            speakAndOpen("Opening starred emails", "starred");
        } else {
            console.log("Unrecognized command.");
            speak("Sorry, I didn't understand that command.");
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening. Restarting...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
        setTimeout(() => recognition.start(), 1000);  // Restart listening
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
}

function speakAndOpen(message, section) {
    speak(message);
    setTimeout(() => openGmailSection(section), 1500);  // Delay to allow speech to play
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
