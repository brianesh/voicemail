chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'readEmails') {
        const emailSnippet = document.querySelector('.zA .y6').textContent;
        alert("Email: " + emailSnippet);
    }

    if (request.action === 'composeEmail') {
        document.querySelector('.T-I.T-I-KE.L3').click();  // For Gmail: clicking the "Compose" button
    }
});
