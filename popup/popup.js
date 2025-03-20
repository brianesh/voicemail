chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateStatus") {
        document.getElementById("status").textContent = `Listening: ${message.status}`;
    }
});

// Request the latest status when the popup opens
chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    if (response && response.status) {
        document.getElementById("status").textContent = `Listening: ${response.status}`;
    }
});
