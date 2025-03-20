chrome.runtime.onInstalled.addListener(() => {
    console.log("Voice Controlled Gmail Assistant Installed.");
  });
  
  chrome.runtime.onStartup.addListener(() => {
    console.log("Extension Started.");
  });
  
  // Listen for messages from the popup or other parts of the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "startListening") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "startVoiceRecognition" });
          sendResponse({ status: "Sent to content script" });
        }
      });
      return true; // Keep sendResponse active
    }
  });
  