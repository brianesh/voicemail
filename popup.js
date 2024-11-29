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
  // Check if SpeechRecognition is supported in the browser
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition.');
      return; // Exit if speech recognition is not supported
  }

  // Initialize the SpeechRecognition object
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';  // Set the language
  recognition.continuous = true;  // Allow continuous listening
  recognition.interimResults = true;  // Show interim results
  
  // Start listening
  recognition.start();

  // Handle speech recognition results
  recognition.onresult = function (event) {
      // Get the transcript of the speech
      const transcript = event.results[0][0].transcript;
      console.log("Recognized Text:", transcript);  // For debugging, see what is recognized

      // Display the result in the result-box
      document.getElementById('result-box').innerText = transcript;
  };

  // Handle recognition errors
  recognition.onerror = function (event) {
      console.error("Speech recognition error: ", event.error);
  };

  // Handle when recognition stops
  recognition.onend = function () {
      console.log("Speech recognition has ended.");
  };
}

function showMicrophoneInstructions() {
  // Show a message prompting the user to enable microphone access
  alert('Please enable microphone access in your browser settings.');
}
