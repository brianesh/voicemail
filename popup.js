// Get elements from popup.html
const voiceToggleBtn = document.getElementById('voice-toggle');
const statusText = document.getElementById('status-text');
const currentLanguage = document.getElementById('current-language');
const currentRate = document.getElementById('current-rate');
const currentPitch = document.getElementById('current-pitch');

// Initialize voice recognition state
let isVoiceActive = false;

// Load stored settings from chrome.storage
chrome.storage.sync.get(['language', 'rate', 'pitch'], (settings) => {
    const language = settings.language || 'en-US';
    const rate = settings.rate || 1;
    const pitch = settings.pitch || 1;

    // Set current settings in the popup
    currentLanguage.textContent = language;
    currentRate.textContent = rate;
    currentPitch.textContent = pitch;
});

// Toggle voice recognition
voiceToggleBtn.addEventListener('click', () => {
    isVoiceActive = !isVoiceActive;

    if (isVoiceActive) {
        voiceToggleBtn.textContent = 'Stop Voice Recognition';
        statusText.textContent = 'Voice recognition is active. Speak now.';
        startVoiceRecognition();
    } else {
        voiceToggleBtn.textContent = 'Start Voice Recognition';
        statusText.textContent = 'Voice recognition is off.';
        stopVoiceRecognition();
    }
});

// Start voice recognition (Web Speech API or similar method)
function startVoiceRecognition() {
    if ('SpeechRecognition' in window) {
        const recognition = new SpeechRecognition();
        recognition.lang = currentLanguage.textContent;
        recognition.rate = currentRate.textContent;
        recognition.pitch = currentPitch.textContent;

        recognition.start();
        
        recognition.onresult = function(event) {
            const speechResult = event.results[0][0].transcript;
            console.log("Speech recognized: ", speechResult);
            // Process speech result to fill email fields
        };

        recognition.onerror = function(event) {
            console.error("Speech recognition error: ", event.error);
        };
    }
}

// Stop voice recognition
function stopVoiceRecognition() {
    // If you have a recognition instance, stop it here
}
