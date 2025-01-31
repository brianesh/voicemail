document.getElementById("start-recognition").addEventListener("click", function () {
    // Start speech recognition
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
      statusElement.textContent = "Status: Error in voice recognition.";
      console.log(event.error);
    };
  }
  
  function handleCommand(command) {

    if (command.includes("open inbox")) {
      chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox" });
    } else if (command.includes("compose email")) {
      chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1" });
    } else {
      console.log("Command not recognized: ", command);
    }
  }
  