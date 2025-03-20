document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("listeningStatus", (data) => {
        const statusText = data.listeningStatus === "ON" ? "Listening: ON" : "Listening: OFF";
        document.getElementById("status").innerText = statusText;
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "refreshPopup") {
            chrome.storage.local.get("listeningStatus", (data) => {
                const statusText = data.listeningStatus === "ON" ? "Listening: ON" : "Listening: OFF";
                document.getElementById("status").innerText = statusText;
            });
        }
    });
});
