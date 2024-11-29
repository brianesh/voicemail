// popup.js

const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;

startButton.addEventListener('click', function () {
  // Ask for permission to use the microphone
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) {
      // If access is granted, start the recognition
      startRecognition();
    })
    .catch(function (error) {
      resultBox.textContent = "Permission denied: Please allow microphone access.";
      showMicrophoneInstructions();
    });
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
  // Show instructions on how to enable microphone
  alert("Please enable microphone access in your browser settings.");
  resultBox.textContent = "To use voice commands, please allow microphone access in your browser settings.";
}

recognition.onresult = function (event) {
  const speechToText = event.results[0][0].transcript;
  resultBox.textContent = `You said: ${speechToText}`;
};

recognition.onerror = function (event) {
  if (event.error === "not-allowed") {
    resultBox.textContent = "Permission denied: Please allow microphone access.";
  } else {
    resultBox.textContent = `Error: ${event.error}`;
  }
};

recognition.onend = function () {
  startButton.disabled = false;
  startButton.textContent = "Start Listening";
};
