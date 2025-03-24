if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false;
    let wakeWordDetected = false;
    let isListening = false;

    // Floating Popup UI
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-size: 16px;
        border-radius: 10px;
        display: none;
        z-index: 9999;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.3);
        transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(popup);

    function showPopup(message, status) {
        popup.innerHTML = `<b>Status:</b> ${status} <br> <b>You said:</b> ${message}`;
        popup.style.display = "block";
        popup.style.opacity = "1";

        clearTimeout(popup.hideTimeout);
        popup.hideTimeout = setTimeout(() => {
            popup.style.opacity = "0";
            setTimeout(() => {
                popup.style.display = "none";
            }, 500);
        }, 3000);
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel(); // Stop any previous speech before speaking new text
        speechSynthesis.speak(utterance);
    }

    // Levenshtein Distance for fuzzy matching
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        let matrix = [];

        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                let cost = b[i - 1] === a[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[b.length][a.length];
    }

    function findClosestMatch(input, commands) {
        let threshold = 2;
        let bestMatch = null;
        let bestScore = Infinity;

        for (let keyword in commands) {
            let distance = levenshteinDistance(input, keyword);
            if (distance < bestScore && distance <= threshold) {
                bestMatch = keyword;
                bestScore = distance;
            }
        }
        return bestMatch;
    }

    function executeCommand(transcript) {
        let lowerTranscript = transcript.toLowerCase();
        const commands = {
            "compose": "https://mail.google.com/mail/u/0/#inbox?compose=new",
            "inbox": "https://mail.google.com/mail/u/0/#inbox",
            "sent": "https://mail.google.com/mail/u/0/#sent",
            "drafts": "https://mail.google.com/mail/u/0/#drafts",
            "starred": "https://mail.google.com/mail/u/0/#starred",
            "snoozed": "https://mail.google.com/mail/u/0/#snoozed",
            "spam": "https://mail.google.com/mail/u/0/#spam",
            "trash": "https://mail.google.com/mail/u/0/#trash",
            "all mail": "https://mail.google.com/mail/u/0/#all",
            "important": "https://mail.google.com/mail/u/0/#important"
        };

        let matchedCommand = findClosestMatch(lowerTranscript, commands);
        if (matchedCommand) {
            showPopup(`Opening ${matchedCommand}...`, "Processing");
            speak(`Opening ${matchedCommand}`);
            setTimeout(() => {
                window.open(commands[matchedCommand], "_self");
            }, 1500);
        } else {
            let responses = [
                "I didn't catch that. Could you try again?",
                "Hmm, I'm not sure what you meant. Can you say it differently?",
                "I didn't understand. Try saying the command more clearly."
            ];
            if (!isActive) return;
            let randomResponse = responses[Math.floor(Math.random() * responses.length)];
            showPopup(randomResponse, "Error");
            speak(randomResponse);
        }
    }

    recognition.onstart = () => {
        isListening = true;
        console.log("Listening...");
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
        let closestWakeWord = wakeWords.find(word => levenshteinDistance(transcript, word) <= 2);

        if (closestWakeWord) {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");
            speak("Voice control activated. How can I assist?");
            return;
        }

        let sleepCommands = ["sleep email", "stop email", "turn off email"];
        let closestSleepCommand = sleepCommands.find(word => levenshteinDistance(transcript, word) <= 2);

        if (closestSleepCommand) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speak("Voice control deactivated. Say 'Hey email' to reactivate.");
            return;
        }

        if (isActive) {
            executeCommand(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showPopup("Error detected", "Error");
        if (event.error === "no-speech" || event.error === "audio-capture") {
            recognition.stop();
            setTimeout(() => {
                recognition.start();
            }, 3000);
        }
    };

    recognition.onend = () => {
        isListening = false;
        console.log("Stopped listening.");
        showPopup("Not listening...", "OFF");

        if (wakeWordDetected) {
            setTimeout(() => {
                if (!isListening) recognition.start();
            }, 1000);
        }
    };

    recognition.start();
}
