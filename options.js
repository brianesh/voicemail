// options.js

// Load settings from chrome.storage when the options page loads
document.addEventListener('DOMContentLoaded', function () {
    // Load saved settings
    chrome.storage.sync.get(['enableVoice', 'voiceLanguage', 'voicePitch', 'voiceRate'], function (data) {
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
      event.preventDefault();
  
      // Get the values from the form
      const enableVoice = document.getElementById('enable-voice').checked;
      const voiceLanguage = document.getElementById('voice-language').value;
      const voicePitch = document.getElementById('voice-pitch').value;
      const voiceRate = document.getElementById('voice-rate').value;
  
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
  });
  