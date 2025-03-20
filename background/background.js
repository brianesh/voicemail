importScripts("wakeworddetector.js", "speechrecognition.js");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Voice Controlled Gmail Assistant Installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startListening") {
    startVoiceRecognition();
    sendResponse({ status: "Listening started" });
  }
});
