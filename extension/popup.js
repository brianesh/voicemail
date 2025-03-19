document.addEventListener("DOMContentLoaded", function () {
    let statusText = document.getElementById("status");

    if (!window.webkitSpeechRecognition) {
        statusText.innerText = "❌ Speech recognition not supported!";
        return;
    }

    let recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = function () {
        statusText.innerText = "🎙️ Listening for commands...";
    };

    recognition.onresult = function (event) {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("🗣 Heard:", command);
        statusText.innerText = `🔍 Processing: "${command}"`;

        if (command.includes("open inbox")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#inbox" });
        } else if (command.includes("open starred")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#starred" });
        } else if (command.includes("open sent")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#sent" });
        } else if (command.includes("open drafts")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#drafts" });
        } else if (command.includes("open trash")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#trash" });
        } else if (command.includes("open spam")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#spam" });
        } else if (command.includes("open all mail")) {
            chrome.runtime.sendMessage({ action: "navigate", url: "https://mail.google.com/mail/u/0/#all" });
        } else if (command.includes("compose email")) {
            chrome.runtime.sendMessage({ action: "start_email_speech_recognition" });
        } else {
            statusText.innerText = "⚠️ Command not recognized.";
        }
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        statusText.innerText = "⚠️ Error: " + event.error;
    };

    recognition.onend = function () {
        statusText.innerText = "🔄 Restarting listening...";
        setTimeout(() => recognition.start(), 1000);
    };

    recognition.start();
});
