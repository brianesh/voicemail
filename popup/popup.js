document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
        document.getElementById("status").textContent = `Listening: ${response.status}`;
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateStatus") {
        document.getElementById("status").textContent = `Listening: ${message.status}`;
    }

    if (message.action === "speak") {
        let responseText = message.response;
        console.log("Speaking:", responseText);
        speak(responseText);
    }
});

function speak(text) {
    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
}
