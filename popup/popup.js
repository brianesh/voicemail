chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    if (chrome.runtime.lastError) {
        console.warn("No response from background script:", chrome.runtime.lastError.message);
        document.getElementById("status").textContent = "Listening: OFF"; 
        return;
    }
    
    if (response && response.status) {
        document.getElementById("status").textContent = `Listening: ${response.status}`;
    }
});
