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
    if (command.includes('compose email')) {
      document.querySelector('div[aria-label="Compose"]').click(); // Gmail compose button
    } else if (command.includes('send email')) {
      document.querySelector('div[aria-label="Send ‪(Ctrl-Enter)‬"]').click(); // Gmail send button
    } else if (command.includes('delete email')) {
      document.querySelector('div[aria-label="Delete"]').click(); // Gmail delete button
    } else if (command.includes('reply email')) {
      document.querySelector('div[aria-label="Reply"]').click(); // Gmail reply button
    } else {
      console.log("Unknown command:", command);
    }
  }
  
  // Start recognition on extension popup open
  chrome.action.onClicked.addListener(startSpeechRecognition);
  