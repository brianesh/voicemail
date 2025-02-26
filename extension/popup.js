document.getElementById("start-recognition").addEventListener("click", function () {
    startVoiceRecognition();
  });
  
  function startVoiceRecognition() {
    const statusElement = document.getElementById("status");
  
    statusElement.textContent = "Status: Listening...";
  
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  
    recognition.start();
  
    recognition.onresult = function (event) {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("Voice command: ", command);
      
      handleCommand(command);
    };
  
    recognition.onerror = function (event) {
      console.error("Speech recognition error: ", event.error);
      statusElement.textContent = "Status: Error, try again.";
      speak("I couldn't understand that. Please try again.");
    };
  
    recognition.onend = function () {
      statusElement.textContent = "Status: Idle";
    };
  }
  
  function handleCommand(command) {
    const statusElement = document.getElementById("status");
  
    if (command.includes("open inbox")) {
      statusElement.textContent = "Status: Opening Inbox...";
      speak("Opening your inbox.");
      
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "openInbox" });
      });
  
    } else if (command.includes("compose email")) {
      statusElement.textContent = "Status: Composing Email...";
      speak("Opening the compose email page.");
      
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "composeEmail" });
      });
  
    } else {
      statusElement.textContent = "Status: Command not recognized.";
      speak("Sorry, I didn't understand that command.");
    }
  }
  
  // Text-to-Speech Function
  function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speechSynthesis.speak(speech);
  }
  