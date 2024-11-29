document.getElementById('startVoiceButton').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'startVoice' });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
        document.getElementById('status').textContent = "Status: " + request.status;
    }
});
