document.getElementById('start-listening').addEventListener('click', function () {
  // Check if the page is served over HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert('Microphone access requires the page to be served over HTTPS or from localhost.');
      return;
  }

  // Request microphone access
  navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
          // Microphone access granted, proceed to speech recognition
          startRecognition(stream);
      })
      .catch(function (error) {
          // If access is denied or any error occurs
          console.error("Microphone access denied: ", error);
          showMicrophoneInstructions();
      });
});

function startRecognition(stream) {
  // Initialize Speech Recognition (use appropriate API based on browser support)
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';  // You can set the language as needed
  recognition.continuous = true;  // Allow continuous speech recognition
  recognition.interimResults = true;  // Show intermediate results as speech is detected
  
  recognition.start();  // Start listening

  recognition.onresult = function(event) {
      // This will be triggered when the speech is recognized
      const transcript = event.results[0][0].transcript;
      document.getElementById('result-box').innerText = transcript;  // Show the transcript in the result box
  };
  recognition.onerror = function(event) {
      // Handle errors
      console.error("Speech recognition error: ", event.error);
  };

  recognition.onend = function() {
      // Speech recognition ended, reset or restart if needed
      console.log("Speech recognition has ended.");
  };
}

function showMicrophoneInstructions() {
  // Show a message prompting the user to enable microphone access
  alert('Please enable microphone access in your browser settings.');
}
