document.addEventListener("DOMContentLoaded", () => {
    const enableVoice = document.getElementById("enable-voice");
    const language = document.getElementById("language");
  
    // Load saved settings
    chrome.storage.sync.get(["enableVoice", "language"], (data) => {
      if (data.enableVoice !== undefined) enableVoice.checked = data.enableVoice;
      if (data.language) language.value = data.language;
    });
  
    // Save settings
    document.getElementById("settings-form").addEventListener("submit", (event) => {
      event.preventDefault();
      chrome.storage.sync.set({
        enableVoice: enableVoice.checked,
        language: language.value
      }, () => {
        alert("Settings saved!");
      });
    });
  });
  