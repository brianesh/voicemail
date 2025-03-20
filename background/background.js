let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Notify popup to update status
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

    if (message.action === "commandRecognized") {
        let command = message.command.toLowerCase();
        console.log("Command received in background.js:", command);

        if (command.includes("open inbox")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening Inbox" });

        } else if (command.includes("compose email")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#compose" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening Compose Email" });

        } else if (command.includes("read emails")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#all" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening all emails" });

        } else if (command.includes("sent mail")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#sent" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening sent emails" });

        } else if (command.includes("snoozed emails")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#snoozed" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening snoozed emails" });

        } else if (command.includes("starred emails")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#starred" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening starred emails" });

        } else {
            console.log("Unknown command:", command);
            chrome.runtime.sendMessage({ action: "speak", response: "Sorry, I didn't understand that" });
        }
    }
});
