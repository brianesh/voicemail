function startVoiceRecognition() {
    const recognition = new webkitSpeechRecognition() || new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("You said:", transcript);
      detectWakeWord(transcript);
      processCommand(transcript);
    };
  
    recognition.start();
  }
  
  function processCommand(command) {
    if (command.includes("read my emails")) {
      chrome.runtime.sendMessage({ action: "readEmails" });
    } else if (command.includes("compose email")) {
      chrome.runtime.sendMessage({ action: "composeEmail" });
    } else {
      console.log("Unknown command.");
    }
  }
  