chrome.runtime.onInstalled.addListener(function () {
    console.log('VOICEMAIL extension installed!');
  });
  
  
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message === "getStatus") {
      sendResponse({ status: "Running" });
    }
  });
  