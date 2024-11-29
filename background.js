// Listen for the extension's installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Voice-Activated Email Extension installed.');
  // You can set default settings on installation if needed
  chrome.storage.sync.get(['language', 'rate', 'pitch'], (settings) => {
      if (!settings.language) {
          // Set default settings if not already set
          chrome.storage.sync.set({
              language: 'en-US',
              rate: 1,
              pitch: 1
          });
      }
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startVoiceRecognition') {
      // Start voice recognition process
      startVoiceRecognition(request, sendResponse);
  }
  if (request.action === 'stopVoiceRecognition') {
      // Stop the voice recognition process
      stopVoiceRecognition();
  }
  return true;  // Indicates you will send a response asynchronously
});

// Start voice recognition
function startVoiceRecognition(request, sendResponse) {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  
  recognition.lang = request.language || 'en-US';  // Get the language from the request or default to English
  recognition.continuous = true;  // Keep listening for new speech
  recognition.interimResults = true;  // Get real-time recognition
  recognition.maxAlternatives = 1;  // Only consider the top alternative
  
  // Event handler for when speech recognition starts
  recognition.onstart = () => {
      console.log('Voice recognition started...');
      sendResponse({ status: 'started' });
  };

  // Event handler for when speech recognition results are returned
  recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex][0].transcript;
      console.log('Voice recognition result: ', transcript);
      
      // Send the result to the popup or content script
      chrome.runtime.sendMessage({
          action: 'voiceRecognitionResult',
          result: transcript
      });
  };

  // Event handler for errors
  recognition.onerror = (event) => {
      console.error('Error in speech recognition: ', event.error);
      sendResponse({ status: 'error', message: event.error });
  };

  // Event handler for when speech recognition stops
  recognition.onend = () => {
      console.log('Voice recognition stopped.');
  };

  // Start listening
  recognition.start();
}

// Stop voice recognition
function stopVoiceRecognition() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.stop();
  console.log('Voice recognition stopped manually.');
}
