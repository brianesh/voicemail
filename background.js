let recognition;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'startVoice') {
        startVoiceRecognition();
    }
});

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support voice recognition.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;

    recognition.onstart = function() {
        chrome.runtime.sendMessage({ action: 'updateStatus', status: 'Listening' });
    };

    recognition.onend = function() {
        chrome.runtime.sendMessage({ action: 'updateStatus', status: 'Not Listening' });
    };

    recognition.onresult = function(event) {
        const command = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
        executeVoiceCommand(command);
    };

    recognition.start();
}

function executeVoiceCommand(command) {
    if (command.includes("read email")) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'readEmails' });
        });
    }

    if (command.includes("compose email")) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'composeEmail' });
        });
    }
}
