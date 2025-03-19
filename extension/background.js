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
            chrome.runtime.sendMessage({ action: "start_email_composition" });
            return; // Stop execution here to handle email composition separately
        } else if (message.command.includes("starred")) {
            url = "https://mail.google.com/mail/u/0/#starred";
        } else if (message.command.includes("snoozed")) {
            url = "https://mail.google.com/mail/u/0/#snoozed";
        } else if (message.command.includes("important")) {
            url = "https://mail.google.com/mail/u/0/#imp"; // "imp" for important
        } else if (message.command.includes("sent")) {
            url = "https://mail.google.com/mail/u/0/#sent";
        } else if (message.command.includes("drafts")) {
            url = "https://mail.google.com/mail/u/0/#drafts";
        } else if (message.command.includes("spam")) {
            url = "https://mail.google.com/mail/u/0/#spam";
        } else if (message.command.includes("trash")) {
            url = "https://mail.google.com/mail/u/0/#trash";
        } else if (message.command.includes("all mail")) {
            url = "https://mail.google.com/mail/u/0/#all"; // "all" for all mail
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

    if (message.action === "start_email_composition") {
        console.log("Opening Gmail Compose Window...");
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                console.error("No active tab found!");
                return;
            }
            chrome.tabs.update(tabs[0].id, { url: "https://mail.google.com/mail/u/0/#inbox?compose=new" });

            // Wait for the compose window to open, then activate voice recognition
            setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "start_email_speech_recognition" });
            }, 3000);
        });
    }
});
