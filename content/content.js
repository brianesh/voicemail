const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    console.error("Speech recognition is not supported in this browser.");
}

let recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleListening") {
        chrome.storage.local.get("listeningStatus", (data) => {
            let newStatus = data.listeningStatus === "ON" ? "OFF" : "ON";
            chrome.storage.local.set({ listeningStatus: newStatus });
            if (newStatus === "ON") {
                recognition.start();
            } else {
                recognition.stop();
            }
            chrome.runtime.sendMessage({ action: "updateStatus" });
        });
    }
});

recognition.onresult = (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log("Recognized:", transcript);
    chrome.runtime.sendMessage({ action: "commandRecognized", command: transcript });
};

recognition.onend = () => {
    chrome.storage.local.get("listeningStatus", (data) => {
        if (data.listeningStatus === "ON") {
            setTimeout(() => recognition.start(), 1000);
        }
    });
};

recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
};
