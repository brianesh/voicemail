chrome.runtime.onInstalled.addListener(() => {
    console.log("Voice-Activated Email Extension Installed");
  });
  
  // Initialize Speech Recognition
  let recognition;
  
  function startSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
  
      recognition.onstart = () => console.log("Speech recognition started.");
      recognition.onresult = handleSpeechResult;
      recognition.onerror = (event) => console.error("Speech recognition error", event);
      recognition.onend = () => console.log("Speech recognition ended.");
      recognition.start();
    } else {
      console.log("Speech Recognition is not supported by this browser.");
    }
  }
  
  function handleSpeechResult(event) {
    const speechTranscript = event.results[event.resultIndex][0].transcript;
    console.log("Speech recognized:", speechTranscript);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: processCommand,
        args: [speechTranscript]
      });
    });
  }

  function processCommand(command) {
    const feedback = new SpeechSynthesisUtterance();
    
    if (command.includes('compose email')) {
      document.querySelector('div[aria-label="Compose"]').click();
      feedback.text = "The compose window is now open.";
    } else if (command.includes('send email')) {
      document.querySelector('div[aria-label="Send ‪(Ctrl-Enter)‬"]').click();
      feedback.text = "The email has been sent.";
    } else if (command.includes('delete email')) {
      document.querySelector('div[aria-label="Delete"]').click();
      feedback.text = "The email has been deleted.";
    } else if (command.includes('reply email')) {
      document.querySelector('div[aria-label="Reply"]').click();
      feedback.text = "You are replying to the email now.";
    } else {
      feedback.text = "Unknown command.";
    }
  
    window.speechSynthesis.speak(feedback);
  }
  
  
  // Start recognition on extension popup open
  chrome.action.onClicked.addListener(startSpeechRecognition);

  chrome.commands.onCommand.addListener((command) => {
    if (command === "compose_email") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: processCommand,
          args: ["compose email"]
        });
      });
    } else if (command === "send_email") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: processCommand,
          args: ["send email"]
        });
      });
    } else if (command === "delete_email") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: processCommand,
          args: ["delete email"]
        });
      });
    }
  });
  
  