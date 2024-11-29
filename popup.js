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

// Ensure window.isVoiceEnabled is defined (initialize if not)
if (typeof window.isVoiceEnabled === 'undefined') {
  window.isVoiceEnabled = false; // Initialize as false
}

// Function to handle the logic of enabling/disabling voice recognition
function toggleVoiceRecognition() {
  // Check if voice recognition is enabled or not
  if (window.isVoiceEnabled) {
      // Stop voice recognition (implement stop logic)
      console.log('Voice recognition stopped');
      window.isVoiceEnabled = false;
      stopSpeechRecognition();  // Call function to stop voice recognition
  } else {
      // Start voice recognition (implement start logic)
      console.log('Voice recognition started');
      window.isVoiceEnabled = true;
      startSpeechRecognition();  // Call function to start voice recognition
  }
}

// Placeholder function to start speech recognition (replace with actual implementation)
function startSpeechRecognition() {
  // Check if SpeechRecognition API is available
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

// Function to stop speech recognition (add your logic here)
function stopSpeechRecognition() {
  // Logic to stop the speech recognition if running
  console.log('Stopping voice recognition...');
  // You would typically need to track the recognition instance globally
}
