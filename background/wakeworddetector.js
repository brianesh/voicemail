function detectWakeWord(transcript) {
    if (transcript.toLowerCase().includes("hey gmail")) {
      chrome.runtime.sendMessage({ command: "startListening" });
    }
  }
  