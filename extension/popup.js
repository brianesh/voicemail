document.addEventListener("DOMContentLoaded", function () {
    let startButton = document.getElementById("start");

    if (!startButton) {
        console.error("Button #start not found!");
        return;
    }

    startButton.addEventListener("click", function () {
        console.log("Button clicked! Requesting microphone access...");

        // Force user to interact with the page before requesting access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                console.log("Microphone access granted.");
                stream.getTracks().forEach(track => track.stop()); // Stop mic after checking permission
                startSpeechRecognition(); // Start recognition only if access is granted
            })
            .catch(function (error) {
                console.error("Microphone access denied:", error);
                alert("Microphone access is blocked. Go to Chrome settings and allow microphone access.");
            });
    });

    function startSpeechRecognition() {
        if (!window.webkitSpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        let recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false; // Stops after one sentence
        recognition.interimResults = false; // Returns final results only
        recognition.start();

        console.log("Speech recognition started...");

        recognition.onresult = function (event) {
            let command = event.results[0][0].transcript;
            console.log("Recognized:", command);
            alert("You said: " + command);
        };

        recognition.onerror = function (event) {
            console.error("Speech recognition error:", event.error);
            alert("Speech recognition error: " + event.error);
        };

        recognition.onend = function () {
            console.log("Speech recognition ended.");
        };
    }
});
