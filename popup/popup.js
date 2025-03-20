chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateStatus") {
        document.getElementById("status").innerText = `Listening: ${message.status}`;
    }
});
