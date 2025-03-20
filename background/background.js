chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: startRecognition
                });
            }
        });
    }
});

// This function runs in the content script
function startRecognition() {
    if (!window.recognition) {
        window.recognition = new webkitSpeechRecognition();
        window.recognition.continuous = true;
        window.recognition.lang = "en-US";

        window.recognition.onstart = () => {
            console.log("Listening...");
            chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
        };

        window.recognition.onresult = (event) => {
            let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            console.log("You said:", transcript);

            if (transcript === "hey email") {
                let utterance = new SpeechSynthesisUtterance("Hello, how can I help you?");
                speechSynthesis.speak(utterance);
            }
        };

        window.recognition.onend = () => {
            console.log("Stopped listening.");
            chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
        };

        window.recognition.start();
    }
}
