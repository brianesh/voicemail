chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ listeningStatus: "OFF" });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleListening" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "commandRecognized") {
        handleCommand(message.command);
    }
});

function handleCommand(command) {
    if (command.includes("open inbox")) {
        openGmailSection("inbox");
    } else if (command.includes("compose email")) {
        openGmailSection("compose");
    } else {
        console.log("Command not recognized.");
    }
}

function openGmailSection(section) {
    let url = `https://mail.google.com/mail/u/0/#${section}`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url });
        } else {
            chrome.tabs.create({ url });
        }
    });
}
