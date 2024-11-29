document.addEventListener("DOMContentLoaded", function() {
  // Default settings
  const defaultValues = {
      language: 'en-US', // Default language (English - US)
      rate: 1,           // Default rate (1x speed)
      pitch: 1           // Default pitch (neutral)
  };

  // Initialize saved settings or use default values
  const savedLanguage = localStorage.getItem('voice-language') || defaultValues.language;
  const savedRate = localStorage.getItem('voice-rate') || defaultValues.rate;
  const savedPitch = localStorage.getItem('voice-pitch') || defaultValues.pitch;

  // Update the displayed settings on the page
  document.getElementById('current-language').textContent = savedLanguage === 'en-US' ? 'English (US)' : savedLanguage;
  document.getElementById('current-rate').textContent = savedRate;
  document.getElementById('current-pitch').textContent = savedPitch;

  // Check for SpeechRecognition support
  if ('webkitSpeechRecognition' in window) {
      // Initialize speech recognition
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true; // Keep recognizing until stopped
      recognition.interimResults = true; // Allow interim results
      recognition.lang = savedLanguage; // Set language from saved settings

      // Event listeners
      recognition.onstart = function() {
          document.getElementById('status-text').textContent = "Voice recognition is on.";
      };
      
      recognition.onend = function() {
          document.getElementById('status-text').textContent = "Voice recognition is off.";
      };

      recognition.onerror = function(event) {
          // Handle specific errors
          if (event.error === 'not-allowed') {
              document.getElementById('status-text').textContent = "Microphone access denied. Please allow microphone permissions.";
          } else {
              document.getElementById('status-text').textContent = `Error: ${event.error}`;
          }
          console.log(`Speech Recognition Error: ${event.error}`); // Log error for debugging
      };

      recognition.onresult = function(event) {
          const transcript = event.results[event.resultIndex][0].transcript;
          console.log("Recognized text: ", transcript); // Log the recognized text for debugging
      };

      // Track recognition state
      let isRecognitionActive = false;

      // Toggle recognition on/off
      document.getElementById('voiceToggleBtn').addEventListener('click', function() {
          if (isRecognitionActive) {
              recognition.stop();
              isRecognitionActive = false;
              console.log("Recognition stopped.");
          } else {
              recognition.start();
              isRecognitionActive = true;
              console.log("Recognition started.");
          }
      });
  } else {
      alert('Your browser does not support Speech Recognition!');
      console.log("Speech Recognition API not supported.");
  }

  // Function to update language, rate, and pitch settings dynamically
  const updateSettings = () => {
      document.getElementById('current-language').textContent = savedLanguage === 'en-US' ? 'English (US)' : savedLanguage;
      document.getElementById('current-rate').textContent = savedRate;
      document.getElementById('current-pitch').textContent = savedPitch;
  };

  // Save language, rate, and pitch settings in localStorage
  const saveSettings = () => {
      localStorage.setItem('voice-language', savedLanguage);
      localStorage.setItem('voice-rate', savedRate);
      localStorage.setItem('voice-pitch', savedPitch);
  };

  // Call the functions to set initial settings and save them
  updateSettings();
  saveSettings();
});
