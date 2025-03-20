const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis; // Speech synthesis

if (!SpeechRecognition || !synth) {
    console.error("Speech recognition or synthesis is not supported in this browser.");
}

let recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;

// Function to speak a response
function speak(text) {
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2; // Slightly higher pitch for a female-like voice
    utterance.rate = 1.0;  // Normal speaking rate

    // Select a female voice if available
    let voices = synth.getVoices();
    let femaleVoice = voices.find(voice => voice.name.includes("Female") || voice.name.includes("Google UK English Female"));
    
    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }

    synth.speak(utterance);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleListening") {
        chrome.storage.local.get("listeningStatus", (data) => {
            let newStatus = data.listeningStatus === "ON" ? "OFF" : "ON";
            chrome.storage.local.set({ listeningStatus: newStatus });

            if (newStatus === "ON") {
                speak("Voice assistant activated.");
                recognition.start();
            } else {
                speak("Voice assistant deactivated.");
                recognition.stop();
            }
            chrome.runtime.sendMessage({ action: "updateStatus" });
        });
    }
});

recognition.onresult = (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log("Recognized:", transcript);

    chrome.runtime.sendMessage({ action: "commandRecognized", command: transcript });

    if (transcript.includes("open inbox")) {
        speak("Opening your inbox.");
    } else if (transcript.includes("compose email")) {
        speak("Opening the compose window.");
    } else {
        speak("Sorry, I didn't understand that command.");
    }
};

recognition.onend = () => {
    chrome.storage.local.get("listeningStatus", (data) => {
        if (data.listeningStatus === "ON") {
            setTimeout(() => recognition.start(), 1000);
        }
    });
};

recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    speak("There was an error with voice recognition.");
};
