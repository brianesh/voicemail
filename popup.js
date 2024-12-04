// Listen for a click on the Start Recognition button
document.getElementById("startRecognitionBtn").addEventListener("click", function() {
    // Send a message to background.js to start speech recognition
    chrome.runtime.sendMessage({ action: "startSpeechRecognition" });
});
