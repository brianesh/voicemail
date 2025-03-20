// When the popup opens, start voice recognition automatically
chrome.runtime.sendMessage({ command: "startListening" });
