document.addEventListener('DOMContentLoaded', function () {
    const startListeningButton = document.getElementById('start-listening');
    const resultBox = document.getElementById('result-box');

    if (startListeningButton) {
        startListeningButton.addEventListener('click', function () {
            // Check if browser supports getUserMedia for microphone access
            if (navigator.mediaDevices) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(function (stream) {
                        // Start speech recognition once microphone access is granted
                        startSpeechRecognition();
                    })
                    .catch(function (error) {
                        console.error("Microphone access denied: ", error);
                        showMicrophoneInstructions();
                    });
            } else {
                console.error("Browser does not support media devices.");
                showMicrophoneInstructions();
            }
        });
    }

    // Function to start speech recognition
    function startSpeechRecognition() {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.onstart = function () {
            console.log("Speech recognition started.");
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            resultBox.textContent = `Recognized Speech: ${transcript}`;
            console.log("Recognized Speech: " + transcript);
        };

        recognition.onerror = function (event) {
            if (event.error === "not-allowed") {
                console.log("Speech recognition error: not-allowed");
                showMicrophoneInstructions();
            } else {
                console.error("Speech recognition error: " + event.error);
            }
        };

        recognition.start();
    }

    // Function to show instructions if microphone is not allowed
    function showMicrophoneInstructions() {
        resultBox.textContent = "To use voice commands, please allow microphone access in your browser settings.";
        alert("To use voice commands, please allow microphone access in your browser settings.");
    }
});
