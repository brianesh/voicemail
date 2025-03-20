let recognition; // Global variable to persist recognition instance

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startRecognition") {
        console.log("Starting voice recognition...");
        startVoiceRecognition();
        sendResponse({ status: "Started" });
    }
});

// Function to start voice recognition
function startVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    // Use a global instance to persist recognition
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Listening...");
        sendRuntimeMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized command:", command);

        if (command.includes("open inbox")) {
            speakAndOpen("Opening inbox", "inbox");
        } else if (command.includes("open sent")) {
            speakAndOpen("Opening sent emails", "sent");
        } else {
            console.log("Unrecognized command.");
            speak("Sorry, I didn't understand that command.");
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
}

// Function to send messages safely
function sendRuntimeMessage(message) {
    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(message, () => {
            if (chrome.runtime.lastError) {
                console.warn("Error sending message:", chrome.runtime.lastError.message);
            }
        });
    }
}

// Function to open Gmail section
function speakAndOpen(message, section) {
    speak(message);
    setTimeout(() => openGmailSection(section), 1500);
}

function openGmailSection(section) {
    let url = `https://mail.google.com/mail/u/0/#${section}`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error("Error querying tabs:", chrome.runtime.lastError.message);
        } else if (tabs.length > 0) {
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
