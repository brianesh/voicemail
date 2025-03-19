console.log("🔊 Voice Assistant is running...");

if (!window.webkitSpeechRecognition) {
    console.error("Your browser does not support Speech Recognition.");
} else {
    let recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = function () {
        console.log("🎤 Listening for wake-up word...");
    };

    recognition.onresult = function (event) {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("🗣 Heard:", command);

        if (command.includes("hey assistant")) {
            console.log("✅ Wake-up word detected! Ready for commands.");
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "start_email_speech_recognition" });
                }
            });
        }
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = function () {
        console.log("🔄 Restarting voice recognition...");
        recognition.start();
    };

    recognition.start();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "navigate") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { url: message.url });
            }
        });
    }
});
