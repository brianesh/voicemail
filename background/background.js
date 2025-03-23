let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Update status without requiring popup to be open
        chrome.storage.local.set({ listeningStatus: listeningStatus });

        // Inject content script only if it's not already injected
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.warn("No active tab found.");
                return;
            }

            let tabId = tabs[0].id;

            // Check if content script is already loaded
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    return typeof window.contentScriptLoaded !== "undefined";
                }
            }, (result) => {
                if (chrome.runtime.lastError) {
                    console.error("Error checking content script:", chrome.runtime.lastError.message);
                    return;
                }

                if (result && result[0] && result[0].result) {
                    console.log("Content script already loaded.");
                    sendMessageToContent(tabId);
                    return;
                }

                // Inject content script if not already loaded
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["content.js"]
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error injecting content script:", chrome.runtime.lastError.message);
                    } else {
                        console.log("Content script injected.");
                        sendMessageToContent(tabId);
                    }
                });
            });
        });
    }

    if (message.action === "updateStatus") {
        listeningStatus = message.status;
        chrome.storage.local.set({ listeningStatus: listeningStatus });

        // Only send message if popup exists
        chrome.runtime.sendMessage({ action: "refreshPopup" }, () => {
            if (chrome.runtime.lastError) {
                console.warn("Popup is not open. Skipping update.");
            }
        });
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }

    return true; // Ensures async sendResponse works
});

// Function to send a message to content script
function sendMessageToContent(tabId) {
    chrome.tabs.sendMessage(tabId, { action: "startRecognition" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError.message);
        } else {
            console.log("Message sent successfully:", response);
        }
    });
}
