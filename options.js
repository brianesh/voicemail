document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['voiceLanguage', 'voiceRate', 'voicePitch'], function(data) {
        document.getElementById('voice-language').value = data.voiceLanguage || 'en';
        document.getElementById('voice-rate').value = data.voiceRate || 1;
        document.getElementById('voice-pitch').value = data.voicePitch || 1;

        // Update display of range values
        document.getElementById('rate-value').textContent = data.voiceRate || 1;
        document.getElementById('pitch-value').textContent = data.voicePitch || 1;
    });

    // Event listener to update the range values
    document.getElementById('voice-rate').addEventListener('input', function() {
        document.getElementById('rate-value').textContent = this.value;
    });

    document.getElementById('voice-pitch').addEventListener('input', function() {
        document.getElementById('pitch-value').textContent = this.value;
    });

    // Save settings when form is submitted
    document.getElementById('settings-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const language = document.getElementById('voice-language').value;
        const rate = document.getElementById('voice-rate').value;
        const pitch = document.getElementById('voice-pitch').value;

        // Save settings to Chrome storage or localStorage
        chrome.storage.sync.set({
            voiceLanguage: language,
            voiceRate: rate,
            voicePitch: pitch
        }, function() {
            alert('Settings saved!');
        });
    });
});
