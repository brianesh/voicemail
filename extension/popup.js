document.addEventListener("DOMContentLoaded", function () {
    let startButton = document.getElementById("start");

    if (!startButton) {
        console.error("Button #start not found!");
        return;
    }

    startButton.addEventListener("click", function () {
        console.log("Button clicked! Sending message to content script...");

        // Send message to `content.js`
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "start_speech" });
        });
    });
});
