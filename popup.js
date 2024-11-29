const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;

startButton.addEventListener('click', function () {
  // Request permission to access the microphone
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) {
      // Permission granted, now start recognition
      startRecognition();
    })
    .catch(function (error) {
      // Permission denied, show instructions
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
