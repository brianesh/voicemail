// Declare the voice recognition state globally
let isVoiceEnabled = false;

// Ensure the DOM is fully loaded before executing the script
document.addEventListener('DOMContentLoaded', function () {
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    
    // Check if the button exists in the DOM
    if (voiceToggleBtn) {
        // Add event listener for click event
        voiceToggleBtn.addEventListener('click', function () {
            console.log('Voice toggle button clicked');
            toggleVoiceRecognition();  // Call the function to toggle voice recognition
        });
    } else {
        console.error('Voice toggle button not found in the DOM');
    }
});

// Function to handle the logic of enabling/disabling voice recognition
function toggleVoiceRecognition() {
    if (isVoiceEnabled) {
        console.log('Voice recognition stopped');
        isVoiceEnabled = false;
        stopSpeechRecognition();  // Stop voice recognition
    } else {
        console.log('Voice recognition started');
        isVoiceEnabled = true;
        startSpeechRecognition();  // Start voice recognition
    }
}

// Function to start speech recognition
function startSpeechRecognition() {
    // Check if SpeechRecognition API is available in the browser
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';  // Set the language to English
        recognition.continuous = true;  // Keep listening to the user

        recognition.onstart = function () {
            console.log('Speech recognition started');
        };

        recognition.onresult = function (event) {
            const transcript = event.results[event.results.length - 1][0].transcript;
            console.log('You said: ', transcript);
            // Add logic here to handle the result (e.g., send email)
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error: ', event.error);
        };

        recognition.onend = function () {
            console.log('Speech recognition ended');
            if (isVoiceEnabled) {
                recognition.start();  // Restart if voice recognition is still enabled
            }
        };

        // Start listening
        recognition.start();
    } else {
        console.error('Speech recognition is not supported in this browser.');
    }
}

// Function to stop speech recognition (placeholder logic for now)
function stopSpeechRecognition() {
    console.log('Stopping voice recognition...');
    // Implement logic to stop the recognition if it's running
    // Note: In real-world cases, you would need to keep track of the recognition instance
}
