document.addEventListener("DOMContentLoaded", function () {
    let startButton = document.getElementById("start");

    if (!startButton) {
        console.error("Button #start not found!");
        return;
    }

    startButton.addEventListener("click", function () {
        console.log("Button clicked! Sending message to content script...");

        // Send a message to content.js to start speech recognition
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                console.error("No active tab found!");
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "start_speech_recognition" });
        });
    });
});
