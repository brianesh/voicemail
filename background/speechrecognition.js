const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    console.error("Speech recognition not supported.");
}

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = "en-US";

let isListening = false;

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
    } else if (command.includes("compose email")) {
        speakAndOpen("Composing a new email", "compose");
    } else if (command.includes("read emails")) {
        readEmails();
    } else if (command.includes("check unread emails")) {
        checkUnreadCount();
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

function readEmails() {
    speak("Reading your latest emails...");
    let url = "https://mail.google.com/mail/u/0/#inbox";
    chrome.tabs.create({ url });
}

function checkUnreadCount() {
    speak("Checking unread email count...");
    fetch("https://mail.google.com/mail/feed/atom")
        .then(response => response.text())
        .then(str => {
            let parser = new DOMParser();
            let xml = parser.parseFromString(str, "text/xml");
            let count = xml.getElementsByTagName("fullcount")[0].textContent;
            speak(`You have ${count} unread emails.`);
        })
        .catch(error => {
            console.error("Error fetching unread emails:", error);
            speak("Unable to check unread emails.");
        });
}

function speak(text) {
    console.log("Speaking:", text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}

startWakeWordDetection();
