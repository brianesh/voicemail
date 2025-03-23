let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        listeningStatus = "ON";
        chrome.storage.local.set({ listeningStatus });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            let tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "updateFloatingPopup", status: listeningStatus });
        });
    }

    if (message.action === "speechRecognized") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            let tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "updateFloatingPopup", text: message.text, status: listeningStatus });
        });
    }

    if (message.action === "stopListening") {
        listeningStatus = "OFF";
        chrome.storage.local.set({ listeningStatus });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            let tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "updateFloatingPopup", status: listeningStatus });
        });
    }
});
