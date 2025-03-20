function startRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        let command = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Recognized:", command);

        // Send command to background script
        chrome.runtime.sendMessage({ action: "commandRecognized", command });
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    console.log("Voice recognition started...");
}

// Wake word detection
const wakeWord = "hey email";

window.onload = function () {
    const wakeRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    wakeRecognition.continuous = true;
    wakeRecognition.interimResults = false;
    wakeRecognition.lang = "en-US";

    wakeRecognition.onresult = (event) => {
        let detectedWord = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Detected wake word:", detectedWord);

        if (detectedWord.includes(wakeWord)) {
            console.log("Wake word detected!");
            chrome.runtime.sendMessage({ action: "wakeWordDetected" });
        }
    };

    wakeRecognition.onerror = (event) => {
        console.error("Wake recognition error:", event.error);
    };

    wakeRecognition.start();
    console.log("Wake word detection started...");
};
