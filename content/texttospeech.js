chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "speakText") {
      let utterance = new SpeechSynthesisUtterance(message.text);
      speechSynthesis.speak(utterance);
    }
  });
  