let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Notify popup
        chrome.runtime.sendMessage({ action: "updateStatus", status: listeningStatus }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message to popup:", chrome.runtime.lastError.message);
            }
        });

        // Ensure an active tab is available
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.warn("No active tab found.");
                return;
            }

            let tabId = tabs[0].id;

            // Check if content script is already running
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error injecting content script:", chrome.runtime.lastError.message);
                } else {
                    console.log("Content script injected.");

                    // Send message to start recognition
                    chrome.tabs.sendMessage(tabId, { action: "startRecognition" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                        } else {
                            console.log("Message sent successfully:", response);
                        }
                    });
                }
            });
        });
    }

    if (message.action === "updateStatus") {
        listeningStatus = message.status;
        chrome.storage.local.set({ listeningStatus: listeningStatus });
        
        chrome.runtime.sendMessage({ action: "refreshPopup" }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating popup status:", chrome.runtime.lastError.message);
            }
        });
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }

    return true; // Ensures async sendResponse works
});
