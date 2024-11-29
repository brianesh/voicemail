// Get elements from options.html
const languageSelect = document.getElementById('voice-language');
const rateSlider = document.getElementById('voice-rate');
const pitchSlider = document.getElementById('voice-pitch');
const rateValue = document.getElementById('rate-value');
const pitchValue = document.getElementById('pitch-value');
const settingsForm = document.getElementById('settings-form');

// Load the saved settings from chrome.storage
chrome.storage.sync.get(['language', 'rate', 'pitch'], (settings) => {
    // Set default values if nothing is saved yet
    const language = settings.language || 'en-US';
    const rate = settings.rate || 1;
    const pitch = settings.pitch || 1;

    // Set values to the corresponding form elements
    languageSelect.value = language;
    rateSlider.value = rate;
    pitchSlider.value = pitch;

    // Display rate and pitch values
    rateValue.textContent = rate;
    pitchValue.textContent = pitch;
});

// Event listener for changes in the rate slider
rateSlider.addEventListener('input', () => {
    rateValue.textContent = rateSlider.value;
});

// Event listener for changes in the pitch slider
pitchSlider.addEventListener('input', () => {
    pitchValue.textContent = pitchSlider.value;
});

// Event listener for the settings form submission
settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Get the updated values from the form elements
    const updatedLanguage = languageSelect.value;
    const updatedRate = rateSlider.value;
    const updatedPitch = pitchSlider.value;

    // Save the updated settings to chrome.storage
    chrome.storage.sync.set({
        language: updatedLanguage,
        rate: updatedRate,
        pitch: updatedPitch
    }, () => {
        alert('Settings saved!');
    });
});
