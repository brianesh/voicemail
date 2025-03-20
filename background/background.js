let listeningStatus = "OFF";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "wakeWordDetected") {
        console.log("Wake word detected: Hey Email");
        listeningStatus = "ON";

        // Notify popup
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

    if (message.action === "updateStatus") {
        listeningStatus = message.status;
    }

    if (message.action === "getStatus") {
        sendResponse({ status: listeningStatus });
    }

    if (message.action === "commandRecognized") {
        let command = message.command.toLowerCase();
        console.log("Command recognized:", command);

        if (command.includes("open inbox")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening Inbox" });

        } else if (command.includes("compose email")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#compose" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening Compose Email" });

        } else if (command.includes("read emails")) {
            chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#all" });
            chrome.runtime.sendMessage({ action: "speak", response: "Opening all emails" });

        } else {
            chrome.runtime.sendMessage({ action: "speak", response: "Sorry, I didn't understand that." });
        }
    }
});
