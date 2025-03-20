let recognition;
let isListening = false;

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        console.error("Speech recognition not supported in this browser.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isListening = true;
        updatePopupStatus("ON");
        console.log("Listening for commands...");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);

        if (transcript === "hey email") {
            speak("Hello, how can I help you?");
        } else {
            processCommand(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
        isListening = false;
        updatePopupStatus("OFF");
        console.log("Stopped listening.");
    };

    recognition.start();
}

function updatePopupStatus(status) {
    chrome.runtime.sendMessage({ action: "updateStatus", status: status });
}

function speak(text) {
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("Voice Assistant Installed.");
    startVoiceRecognition();
});
