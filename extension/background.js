chrome.runtime.onInstalled.addListener(() => {
    console.log("VoiceMail Assistant Installed Successfully.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "process_command") {
        console.log("Processing command:", message.command);

        let url = null;
        if (message.command.includes("open inbox")) {
            url = "https://mail.google.com/mail/u/0/#inbox";
        } else if (message.command.includes("compose email")) {
            url = "https://mail.google.com/mail/u/0/#inbox?compose=new";
        }

        if (url) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length === 0) {
                    console.error("No active tab found!");
                    return;
                }
                chrome.tabs.update(tabs[0].id, { url: url });
            });
        }
    }
});
