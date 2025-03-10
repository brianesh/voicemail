chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_speech_recognition") {
        console.log("Starting Speech Recognition in the active tab...");

        if (!window.webkitSpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        // Request microphone access explicitly before starting recognition
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                console.log("Microphone access granted.");

                let recognition = new webkitSpeechRecognition();
                recognition.lang = "en-US";
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.start();

                recognition.onresult = function (event) {
                    let command = event.results[0][0].transcript;
                    console.log("Recognized:", command);
                    alert("You said: " + command);

                    // Send the recognized command to background.js
                    chrome.runtime.sendMessage({ action: "process_command", command: command });
                };

                recognition.onerror = function (event) {
                    console.error("Speech recognition error:", event.error);
                    alert("Speech recognition error: " + event.error);
                };

                recognition.onend = function () {
                    console.log("Speech recognition ended.");
                };
            })
            .catch((error) => {
                console.error("Microphone access denied:", error);
                alert("Microphone access denied. Please enable it in Chrome settings.");
            });
    }
});
