function startRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized:", command);

        // Send the recognized command to background.js
        chrome.runtime.sendMessage({ action: "commandRecognized", command }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Message sending error:", chrome.runtime.lastError.message);
            } else {
                console.log("Command sent to background.js:", command);
            }
        });
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    console.log("Voice recognition started...");
}

// Listen for the wake word "Hey Email"
const wakeWord = "hey email";

window.onload = function () {
    const wakeRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    wakeRecognition.continuous = true;
    wakeRecognition.interimResults = false;
    wakeRecognition.lang = "en-US";

    wakeRecognition.onresult = (event) => {
        let detectedWord = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
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
