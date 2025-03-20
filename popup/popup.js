document.addEventListener("DOMContentLoaded", () => {
    let statusText = document.getElementById("status");

    chrome.storage.local.get("listeningStatus", (data) => {
        statusText.innerText = data.listeningStatus === "ON" ? "Listening: ON" : "Listening: OFF";
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "updateStatus") {
            chrome.storage.local.get("listeningStatus", (data) => {
                statusText.innerText = data.listeningStatus === "ON" ? "Listening: ON" : "Listening: OFF";
            });
        }
    });
});
