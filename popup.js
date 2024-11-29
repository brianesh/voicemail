const startListeningButton = document.getElementById("startListening");

startListeningButton.addEventListener("click", function() {
  if (navigator.mediaDevices) {
    // First, attempt to get the microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        console.log("Microphone access granted.");

        // Start Speech Recognition if microphone access is granted
        startSpeechRecognition();
      })
      .catch(function(error) {
        console.error("Microphone access denied: " + error);
        showMicrophoneInstructions();
      });
  } else {
    console.error("Browser does not support media devices.");
  }
});

// Function to start the speech recognition
function startSpeechRecognition() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.onstart = function() {
    console.log("Speech recognition started.");
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    console.log("Recognized Speech: " + transcript);
  };

  recognition.onerror = function(event) {
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
  alert("To use voice commands, please allow microphone access in your browser settings.");
  // Additional steps like opening settings or showing a manual could be added here
}
