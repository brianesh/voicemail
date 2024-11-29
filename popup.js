const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");

// Check if the browser supports speech recognition
if (!('webkitSpeechRecognition' in window)) {
  alert("Speech recognition not supported by this browser.");
}

const recognition = new webkitSpeechRecognition(); // Initialize speech recognition

// Speech recognition settings
recognition.continuous = true;  // Keep listening until manually stopped
recognition.interimResults = true;  // Show partial results

// Event listener for when speech is recognized
recognition.onresult = function (event) {
  const transcript = event.results[0][0].transcript;
  resultBox.textContent = `You said: ${transcript}`;
};

// Event listener for errors
recognition.onerror = function (event) {
  if (event.error === 'not-allowed') {
    showMicrophoneInstructions();  // Prompt user to enable microphone
  }
};

// Start listening when the button is clicked
startButton.addEventListener("click", function () {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) {
      recognition.start(); // Start the speech recognition process
    })
    .catch(function (error) {
      console.error("Microphone access denied: ", error);
      showMicrophoneInstructions();
    });
});

// Show instruction if microphone is not enabled
function showMicrophoneInstructions() {
  resultBox.textContent = "To use voice commands, please allow microphone access in your browser settings.";
  alert("Please allow microphone access in your browser settings to start using voice commands.");
}
