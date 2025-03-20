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
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }
});
