// popup.js

const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

// Configure recognition settings
recognition.continuous = false;
recognition.interimResults = false;

// Start listening when the button is clicked
startButton.addEventListener('click', function () {
  try {
    recognition.start();
    startButton.disabled = true;
    startButton.textContent = "Listening...";
  } catch (error) {
    resultBox.textContent = "Error: " + error.message;
    console.error("Error during recognition:", error);
  }
});

// Handle the result of speech recognition
recognition.onresult = function (event) {
  const speechToText = event.results[0][0].transcript;
  resultBox.textContent = `You said: ${speechToText}`;
};

recognition.onerror = function (event) {
  // Handle specific error cases, like permission denial
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
