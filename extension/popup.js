document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("start").addEventListener("click", startVoiceRecognition);
});

function startVoiceRecognition() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        alert("Your browser does not support Speech Recognition.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = function (event) {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log("Recognized Command:", command);

        handleCommand(command);
    };

    recognition.onerror = function (event) {
        console.error("Speech Recognition Error:", event.error);

        let errorMessage = "An error occurred.";
        switch (event.error) {
            case "no-speech":
                errorMessage = "No speech detected. Please try again.";
                break;
            case "audio-capture":
                errorMessage = "Microphone not detected. Check your settings.";
                break;
            case "not-allowed":
                errorMessage = "Microphone access denied. Allow permissions.";
                break;
            case "aborted":
                errorMessage = "Speech recognition was aborted.";
                break;
            default:
                errorMessage = "Sorry, I couldn't understand that.";
                break;
        }

        speak(errorMessage);
    };

    recognition.onend = function () {
        console.log("Voice recognition ended.");
    };
}

function handleCommand(command) {
    if (command.includes("open inbox")) {
        speak("Opening your inbox.");
        chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox" });

    } else if (command.includes("compose email")) {
        speak("Opening the compose email page.");
        chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox?compose=new" });

    } else {
        speak("Sorry, I didn't understand that command.");
    }
}

// Text-to-Speech (TTS)
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
}
