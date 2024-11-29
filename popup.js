// popup.js

// Wait for the DOM to fully load before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Select the button by its ID
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');
  
  // Ensure the button exists before adding the event listener
  if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
          console.log('Voice toggle button clicked');
          
          // Toggle the voice recognition functionality
          toggleVoiceRecognition();
      });
  } else {
      console.error('Voice toggle button not found in the DOM');
  }
});

// Function to handle the logic of enabling/disabling voice recognition
function toggleVoiceRecognition() {
  // Example logic to toggle voice recognition (you can replace this with actual functionality)
  console.log('Voice recognition toggled');

  // Check if voice recognition is enabled or not
  if (window.isVoiceEnabled) {
      // Stop voice recognition (you'll need to implement this in your speech recognition logic)
      console.log('Voice recognition stopped');
      window.isVoiceEnabled = false;
  } else {
      // Start voice recognition (implement your logic here)
      console.log('Voice recognition started');
      window.isVoiceEnabled = true;

      // Example of using the SpeechRecognition API to start voice recognition
      startSpeechRecognition();
  }
}

// Placeholder function to start speech recognition (replace with actual implementation)
function startSpeechRecognition() {
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = 'en-US'; // Set the language
      recognition.continuous = true; // Keep recognizing as the user speaks
      
      recognition.onstart = () => {
          console.log('Speech recognition started');
      };

      recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          console.log('You said: ', transcript);
          // Process the speech result here (like sending an email or performing actions)
      };

      recognition.onerror = (event) => {
          console.error('Speech recognition error: ', event.error);
      };

      recognition.onend = () => {
          console.log('Speech recognition ended');
          if (window.isVoiceEnabled) {
              recognition.start(); // Restart if voice recognition is still enabled
          }
      };

      // Start recognition
      recognition.start();
  } else {
      console.log('Speech recognition is not supported in this browser.');
  }
}
