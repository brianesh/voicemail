chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startRecognition") {
        console.log("Listening for commands...");
        startRecognition();
    }
});

function startRecognition() {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript.toLowerCase();
        console.log("You said:", transcript);

        if (transcript.includes("open inbox")) {
            speak("Opening inbox");
            window.location.href = "https://mail.google.com/mail/u/0/#inbox";
        } else if (transcript.includes("compose email")) {
            speak("Composing new email");
            window.location.href = "https://mail.google.com/mail/u/0/#compose";
        } else if (transcript.includes("read email")) {
            speak("Opening your latest email");
            window.location.href = "https://mail.google.com/mail/u/0/#inbox";
        } else if (transcript.includes("sent emails")) {
            speak("Opening sent emails");
            window.location.href = "https://mail.google.com/mail/u/0/#sent";
        } else if (transcript.includes("snoozed emails")) {
            speak("Opening snoozed emails");
            window.location.href = "https://mail.google.com/mail/u/0/#snoozed";
        } else if (transcript.includes("starred emails")) {
            speak("Opening starred emails");
            window.location.href = "https://mail.google.com/mail/u/0/#starred";
        } else {
            speak("Sorry, I didn't understand that command.");
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        speak("I couldn't understand. Please try again.");
    };

    recognition.start();
}

function speak(text) {
    let synth = window.speechSynthesis;
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    synth.speak(utterance);
}
