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
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: startSpeechRecognition
            });
        });
    });

    function startSpeechRecognition() {
        if (!window.webkitSpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        let recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.start();

        console.log("Speech recognition started...");

        recognition.onresult = function (event) {
            let command = event.results[0][0].transcript;
            console.log("Recognized:", command);
            alert("You said: " + command);
        };

        recognition.onerror = function (event) {
            console.error("Speech recognition error:", event.error);
            alert("Speech recognition error: " + event.error);
        };

        recognition.onend = function () {
            console.log("Speech recognition ended.");
        };
    }
});
