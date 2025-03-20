let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Notify popup
        chrome.runtime.sendMessage({ action: "updateStatus", status: listeningStatus }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError.message);
            }
        });

        // Start recognition in the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "startRecognition" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn("No active tab found.");
            }
        });
    }

    if (message.action === "updateStatus") {
        listeningStatus = message.status;
        chrome.storage.local.set({ listeningStatus: listeningStatus });
        chrome.runtime.sendMessage({ action: "refreshPopup" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError.message);
            }
        });
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }

    return true; // Keep sendResponse() open for async operations
});

// Function to start voice recognition
function startRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech recognition not supported.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Recognized:", command);
        chrome.runtime.sendMessage({ action: "commandRecognized", command }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error sending command:", chrome.runtime.lastError.message);
            }
        });
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    console.log("Voice recognition started...");
}
