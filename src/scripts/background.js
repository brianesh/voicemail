chrome.runtime.onInstalled.addListener(function () {
    console.log('VOICEMAIL extension installed!');
  });
  
  // Example listener for events (you can expand functionality here)
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message === "getStatus") {
      sendResponse({ status: "Running" });
    }
  });
  