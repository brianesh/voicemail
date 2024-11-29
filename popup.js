document.addEventListener('DOMContentLoaded', function () {
    const startListeningButton = document.getElementById('start-listening');
    const resultBox = document.getElementById('result-box');  // Ensure this ID matches the HTML

    if (startListeningButton) {
        startListeningButton.addEventListener('click', function () {
            // Check if the browser supports getUserMedia for microphone access
            if (navigator.mediaDevices) {
                // Request microphone access
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
            // Handle different error types
            if (event.error === "not-allowed") {
                console.log("Speech recognition error: not-allowed");
                showMicrophoneInstructions();
            } else if (event.error === "network") {
                console.log("Speech recognition error: network");
                resultBox.textContent = "Network error occurred, please check your connection.";
            } else if (event.error === "no-speech") {
                console.log("Speech recognition error: no-speech");
                resultBox.textContent = "No speech detected.";
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
