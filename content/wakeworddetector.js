function detectWakeWord(transcript) {
    if (transcript.toLowerCase().includes("hey email")) {
      chrome.runtime.sendMessage({ command: "startListening" });
    }
  }
  