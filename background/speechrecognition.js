// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    console.error("Speech recognition not supported in this browser.");
}

const recognition = new SpeechRecognition();
recognition.continuous = true;  // Keep listening
recognition.interimResults = false;
recognition.lang = "en-US";

let isListening = false;

// Start listening for wake word
function startWakeWordDetection() {
    recognition.start();
    console.log("Listening for 'Hey Email'...");
}

recognition.onresult = (event) => {
    let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Recognized:", command);

    if (!isListening && command.includes("hey email")) {
        isListening = true;
        console.log("Wake word detected!");
        speak("Hello! How can I help you?");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    } else if (isListening) {
        executeCommand(command);
    }
};

// Handle errors and restart listening
recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    setTimeout(() => recognition.start(), 1000);
};

recognition.onend = () => {
    console.log("Recognition stopped. Restarting...");
    setTimeout(() => recognition.start(), 1000);
};

function executeCommand(command) {
    if (command.includes("open inbox")) {
        speakAndOpen("Opening inbox", "inbox");
    } else if (command.includes("open sent")) {
        speakAndOpen("Opening sent", "sent");
    } else if (command.includes("open snoozed")) {
        speakAndOpen("Opening snoozed", "snoozed");
    } else if (command.includes("open starred")) {
        speakAndOpen("Opening starred", "starred");
    } else {
        speak("Sorry, I didn't understand that.");
    }
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

function speak(text) {
    console.log("Speaking:", text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}

// Start listening for the wake word
startWakeWordDetection();
