let recognition;

function startRecognition() {
    if (!("webkitSpeechRecognition" in window)) {
        console.error("Speech recognition is not supported in this browser.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        console.log("Voice recognition started...");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript.toLowerCase();
        console.log("You said:", transcript);

        if (transcript.includes("inbox")) {
            speak("Opening inbox");
            window.location.href = "https://mail.google.com/mail/u/0/#inbox";
        } else if (transcript.includes("compose")) {
            speak("Opening compose window");
            window.location.href = "https://mail.google.com/mail/u/0/#compose";
        } else if (transcript.includes("sent")) {
            speak("Opening sent mail");
            window.location.href = "https://mail.google.com/mail/u/0/#sent";
        } else if (transcript.includes("snoozed")) {
            speak("Opening snoozed emails");
            window.location.href = "https://mail.google.com/mail/u/0/#snoozed";
        } else if (transcript.includes("starred")) {
            speak("Opening starred emails");
            window.location.href = "https://mail.google.com/mail/u/0/#starred";
        } else {
            speak("Command not recognized. Please try again.");
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
        console.log("Voice recognition ended.");
    };

    recognition.start();
}

function speak(text) {
    console.log("Speaking:", text);
    let synth = window.speechSynthesis;
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    synth.speak(utterance);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content.js:", message);
    if (message.action === "startRecognition") {
        startRecognition();
    }
});
