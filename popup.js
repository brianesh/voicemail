// popup.js
const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;

startButton.addEventListener('click', function () {
  // Check microphone permission before starting recognition
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'microphone' }).then(function (permissionStatus) {
      if (permissionStatus.state === 'denied') {
        resultBox.textContent = "Permission denied: Please enable microphone access.";
        showMicrophoneInstructions();
      } else {
        startRecognition();
      }
    }).catch(function (error) {
      console.error('Permission query failed', error);
      resultBox.textContent = "Error checking permissions: " + error;
    });
  } else {
    // If no permission API, try to start recognition directly
    startRecognition();
  }
});

function startRecognition() {
  try {
    recognition.start();
    startButton.disabled = true;
    startButton.textContent = "Listening...";
  } catch (error) {
    resultBox.textContent = "Error starting recognition: " + error.message;
    console.error("Error starting recognition:", error);
  }
}

function showMicrophoneInstructions() {
  // Show user instructions for enabling microphone in the browser
  alert("Please enable microphone access in your browser settings.");
  // Alternatively, you could show a more custom message in your extension's popup
  resultBox.textContent = "To use voice commands, please allow microphone access in your browser settings.";
}

// Handle speech results
recognition.onresult = function (event) {
  const speechToText = event.results[0][0].transcript;
  resultBox.textContent = `You said: ${speechToText}`;
};

// Handle errors during speech recognition
recognition.onerror = function (event) {
  if (event.error === "not-allowed") {
    resultBox.textContent = "Permission denied: Please allow microphone access.";
  } else {
    resultBox.textContent = `Error: ${event.error}`;
  }
};

// End recognition
recognition.onend = function () {
  startButton.disabled = false;
  startButton.textContent = "Start Listening";
};
