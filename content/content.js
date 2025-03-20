// Only run in Gmail
if (window.location.href.includes("mail.google.com")) {
    console.log("Voice Assistant Running on Gmail");
  
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.command === "startVoiceRecognition") {
        startVoiceRecognition();
        sendResponse({ status: "Voice recognition started" });
      }
    });
  
    function startVoiceRecognition() {
      if (!("webkitSpeechRecognition" in window)) {
        console.error("Speech recognition not supported in this browser.");
        return;
      }
  
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
  
      recognition.onstart = () => {
        console.log("Listening...");
      };
  
      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        console.log("Heard:", transcript);
        handleCommand(transcript);
      };
  
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
  
      recognition.onend = () => {
        console.log("Speech recognition stopped. Restarting...");
        startVoiceRecognition(); // Restart after completion
      };
  
      recognition.start();
    }
  
    function handleCommand(command) {
      if (command.toLowerCase().includes("compose email")) {
        window.location.href = "https://mail.google.com/mail/u/0/#inbox?compose=new";
      } else if (command.toLowerCase().includes("read emails")) {
        console.log("Reading emails... (implement text-to-speech)");
      } else {
        console.log("Command not recognized:", command);
      }
    }
  }
  