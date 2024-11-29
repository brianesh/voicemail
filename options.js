// options.js

// Load settings from chrome.storage when the options page loads
document.addEventListener('DOMContentLoaded', function () {
    // Load saved settings
    chrome.storage.sync.get(['enableVoice', 'voiceLanguage', 'voicePitch', 'voiceRate'], function (data) {
        // Set default values if none are saved
        if (data.enableVoice !== undefined) {
            document.getElementById('enable-voice').checked = data.enableVoice;
        }
        if (data.voiceLanguage) {
            document.getElementById('voice-language').value = data.voiceLanguage;
        }
        if (data.voicePitch) {
            document.getElementById('voice-pitch').value = data.voicePitch;
        }
        if (data.voiceRate) {
            document.getElementById('voice-rate').value = data.voiceRate;
        }
    });
  
    // Save settings when the user submits the form
    document.getElementById('settings-form').addEventListener('submit', function (event) {
        event.preventDefault();  // Prevent the form from submitting
        
        // Get the values from the form
        const enableVoice = document.getElementById('enable-voice').checked;
        const voiceLanguage = document.getElementById('voice-language').value;
        const voicePitch = document.getElementById('voice-pitch').value;
        const voiceRate = document.getElementById('voice-rate').value;

        // Form validation - Ensure that the values are valid
        if (voicePitch < 0 || voicePitch > 2) {
            alert('Voice pitch must be between 0 and 2.');
            return;
        }
        if (voiceRate < 0.1 || voiceRate > 2) {
            alert('Voice rate must be between 0.1 and 2.');
            return;
        }

        // Save the settings to chrome.storage
        chrome.storage.sync.set({
            enableVoice,
            voiceLanguage,
            voicePitch,
            voiceRate
        }, function () {
            alert('Settings saved!');
        });
    });
  
    // Optional: Add event listeners for real-time UI updates
    document.getElementById('enable-voice').addEventListener('change', function () {
        const isEnabled = this.checked;
        // You can also show a message or update some UI based on the checkbox state
        console.log('Voice commands enabled:', isEnabled);
    });
  
    // Optional: You can handle other controls dynamically
    document.getElementById('voice-language').addEventListener('change', function () {
        const language = this.value;
        console.log('Selected language:', language);
    });
});
