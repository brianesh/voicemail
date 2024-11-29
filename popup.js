// popup.js

const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;

startButton.addEventListener('click', function () {
  // Request permission to use the microphone if not granted
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'microphone' }).then(function (permissionStatus) {
      if (permissionStatus.state === 'denied') {
        resultBox.textContent = "Permission denied: Please allow microphone access in your browser settings.";
      } else {
        startRecognition();
      }
    }).catch(function (error) {
      console.error('Permission query failed', error);
      resultBox.textContent = "Error checking permissions: " + error;
    });
  } else {
    // If navigator.permissions is not supported, try starting recognition directly
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
