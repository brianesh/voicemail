let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Notify popup
        chrome.runtime.sendMessage({ action: "updateStatus", status: listeningStatus });

        // Start recognition in the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: startRecognition
                });
            }
        });
    }

    if (message.action === "updateStatus") {
        listeningStatus = message.status;
        chrome.storage.local.set({ listeningStatus: listeningStatus });
        chrome.runtime.sendMessage({ action: "refreshPopup" });
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }
});

// Function to start voice recognition
function startRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported.");
        return;let listeningStatus = "OFF";

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === "wakeWordDetected") {
                console.log("Wake word detected: Hey Email");
                listeningStatus = "ON";
        
                // Notify popup
                chrome.runtime.sendMessage({ action: "updateStatus", status: listeningStatus });
        
                // Send message to content.js to start recognition
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "startRecognition" });
                    }
                });
            }
        
            if (message.action === "getStatus") {
                sendResponse({ status: listeningStatus });
            }
        });
        
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized:", command);
        chrome.runtime.sendMessage({ action: "commandRecognized", command });
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    console.log("Voice recognition started...");
}
