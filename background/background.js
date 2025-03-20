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

        // Ensure content script is injected before sending messages
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                let tabId = tabs[0].id;

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["content.js"]
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error injecting script:", chrome.runtime.lastError.message);
                    } else {
                        console.log("Content script injected.");
                        // Now send the message to start recognition
                        chrome.tabs.sendMessage(tabId, { action: "startRecognition" }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Error sending message:", chrome.runtime.lastError.message);
                            }
                        });
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
