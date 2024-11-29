// popup.js

// Check if the SpeechRecognition API is available
const startButton = document.getElementById("start-listening");
const resultBox = document.getElementById("result-box");
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

// Configure recognition settings
recognition.continuous = false;  // Stops automatically after speech
recognition.interimResults = false;  // Only returns final results

// Start listening when the button is clicked
startButton.addEventListener('click', function () {
  recognition.start();  // Start speech recognition
  startButton.disabled = true;  // Disable the button until recognition ends
  startButton.textContent = "Listening...";  // Change button text to indicate listening
});

// When speech is recognized, process it
recognition.onresult = function (event) {
  const speechToText = event.results[0][0].transcript;  // Get the text from speech
  resultBox.textContent = `You said: ${speechToText}`;  // Display the recognized text
  
  // If you want to trigger email-related actions, you can check for specific phrases
  if (speechToText.toLowerCase().includes("send email")) {
    // Trigger email sending function or open the email client
    console.log("User wants to send an email");
  }
};

// Handle errors
recognition.onerror = function (event) {
  console.error("Speech recognition error", event.error);
  resultBox.textContent = "Error: " + event.error;  // Display the error message
};

// When recognition ends, re-enable the button and update the text
recognition.onend = function () {
  startButton.disabled = false;  // Re-enable the button
  startButton.textContent = "Start Listening";  // Change button text back to normal
};
