chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "process_command") {
        console.log("Received command:", message.command);
    }
});
