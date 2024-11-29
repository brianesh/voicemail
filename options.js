// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
    const enableVoiceCheckbox = document.getElementById("enable-voice");
    const voiceLanguageSelect = document.getElementById("voice-language");
    const voicePitchSlider = document.getElementById("voice-pitch");
    const voiceRateSlider = document.getElementById("voice-rate");
    const settingsForm = document.getElementById("settings-form");
  
    if (!enableVoiceCheckbox || !voiceLanguageSelect || !voicePitchSlider || !voiceRateSlider || !settingsForm) {
      console.error("One or more required elements are missing from the HTML.");
      return;
    }
  
    // Load saved settings from localStorage (or defaults)
    function loadSettings() {
      try {
        const enableVoice = JSON.parse(localStorage.getItem("enableVoice")) ?? false;
        const voiceLanguage = localStorage.getItem("voiceLanguage") ?? "en-US";
        const voicePitch = parseFloat(localStorage.getItem("voicePitch")) ?? 1;
        const voiceRate = parseFloat(localStorage.getItem("voiceRate")) ?? 1;
  
        enableVoiceCheckbox.checked = enableVoice;
        voiceLanguageSelect.value = voiceLanguage;
        voicePitchSlider.value = voicePitch;
        voiceRateSlider.value = voiceRate;
      } catch (error) {
        console.error("Error loading settings from localStorage:", error);
      }
    }
  
    // Save settings to localStorage
    function saveSettings() {
      try {
        const enableVoice = enableVoiceCheckbox.checked;
        const voiceLanguage = voiceLanguageSelect.value;
        const voicePitch = voicePitchSlider.value;
        const voiceRate = voiceRateSlider.value;
  
        localStorage.setItem("enableVoice", JSON.stringify(enableVoice));
        localStorage.setItem("voiceLanguage", voiceLanguage);
        localStorage.setItem("voicePitch", voicePitch);
        localStorage.setItem("voiceRate", voiceRate);
  
        alert("Settings saved successfully!");
      } catch (error) {
        console.error("Error saving settings to localStorage:", error);
      }
    }
  
    // Event listener for form submission
    settingsForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveSettings();
    });
  
    // Real-time preview for pitch and rate sliders
    voicePitchSlider.addEventListener("input", function () {
      console.log(`Voice Pitch: ${voicePitchSlider.value}`);
    });
  
    voiceRateSlider.addEventListener("input", function () {
      console.log(`Voice Rate: ${voiceRateSlider.value}`);
    });
  
    // Initialize settings on page load
    loadSettings();
  });
  