console.log("Voice Assistant is active on Gmail.");

function startSpeechRecognition() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            console.log("Microphone access granted.");
            stream.getTracks().forEach(track => track.stop()); // Stop mic after checking permission

            let recognition = new webkitSpeechRecognition();
            recognition.lang = "en-US";
            recognition.continuous = true; // Keeps running
            recognition.interimResults = true; // Shows real-time text
            recognition.maxAlternatives = 1; // Use only one result

            recognition.start();
            console.log("Speech recognition started...");

            let speechTimeout = setTimeout(() => {
                console.warn("No speech detected, restarting...");
                recognition.stop();
                recognition.start();
            }, 10000); // Restart after 10 seconds of silence

            recognition.onresult = function (event) {
                clearTimeout(speechTimeout); // Reset timeout when speech is detected
                let command = event.results[0][0].transcript.toLowerCase();
                console.log("Recognized:", command);
            };

            recognition.onerror = function (event) {
                console.error("Speech recognition error:", event.error);
                if (event.error === "no-speech") {
                    console.warn("No speech detected. Try speaking louder.");
                }
            };

            recognition.onend = function () {
                console.log("Recognition ended. Restarting...");
                recognition.start(); // Restart automatically
            };
        })
        .catch(function (error) {
            console.error("Microphone access denied:", error);
        });
}
