document.getElementById('start-recognition').addEventListener('click', () => {
    chrome.runtime.getBackgroundPage(background => {
      background.startSpeechRecognition();
    });
  });
  