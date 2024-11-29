// Select the button element
const startListeningButton = document.getElementById("start-listening");

// Ensure the button exists before adding the event listener
if (startListeningButton) {
    startListeningButton.addEventListener("click", function () {
        console.log("Start Listening button clicked");

        // Functionality to handle microphone access and start recognition
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                console.log("Microphone access granted");
                startRecognition(); // Start speech recognition
            })
            .catch(function (error) {
                console.error("Microphone access denied:", error);
                showMicrophoneInstructions(); // Notify the user to enable microphone
            });
    });
} else {
    console.error("Button with ID 'start-listening' not found.");
}

// Function to start speech recognition
function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onstart = function () {
        console.log("Speech recognition started");
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        console.log("Recognized text:", transcript);

        const resultBox = document.getElementById("result-box");
        if (resultBox) {
            resultBox.textContent = transcript;
        } else {
            console.error("Result box with ID 'result-box' not found.");
        }
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = function () {
        console.log("Speech recognition ended");
    };

    try {
        recognition.start(); // Start speech recognition
    } catch (error) {
        console.error("Error starting speech recognition:", error);
    }
}

// Function to show instructions when microphone access is denied
function showMicrophoneInstructions() {
    alert("Please enable microphone access in your browser settings.");
}
