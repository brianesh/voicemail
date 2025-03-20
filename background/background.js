import { detectWakeWord } from "./wakeword.js";
import { speakText } from "./texttospeech.js";
import { startVoiceRecognition } from "./speechrecognition.js";

let isListening = false;

// Detect "Hey Email"
detectWakeWord(() => {
  console.log("Wake word detected: Hey Email");
  speakText("Hello, how can I help you?");
  setTimeout(startVoiceRecognition, 1500); // Wait before listening for command
});

// Update popup UI
function updatePopup() {
  chrome.runtime.sendMessage({ listening: isListening });
}
