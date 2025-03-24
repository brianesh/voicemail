if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false; 
    let wakeWordDetected = false;

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

    // Function to calculate Levenshtein Distance
    function levenshteinDistance(a, b) {
        let tmp;
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        if (a.length > b.length) { tmp = a; a = b; b = tmp; }

        let row = Array(a.length + 1).fill(0).map((_, i) => i);
        for (let i = 1; i <= b.length; i++) {
            let prev = i;
            for (let j = 1; j <= a.length; j++) {
                let val;
                if (b[i - 1] === a[j - 1]) {
                    val = row[j - 1];
                } else {
                    val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
                }
                row[j - 1] = prev;
                prev = val;
            }
            row[a.length] = prev;
        }
        return row[a.length];
    }

    // Function to check for closest match
    function findClosestMatch(input, commands) {
        let threshold = 2; // Allow minor mistakes (2-letter difference)
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

    // Function to execute a command
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

            let utterance = new SpeechSynthesisUtterance(`Opening ${matchedCommand}`);
            speechSynthesis.speak(utterance);

            setTimeout(() => {
                window.open(commands[matchedCommand], "_self");
            }, 1500);
        } else {
            showPopup("Unknown command", "Error");
            let unknownUtterance = new SpeechSynthesisUtterance("Sorry, I didn't understand that.");
            speechSynthesis.speak(unknownUtterance);
        }
    }

    // Improved Speech Recognition Handling
    recognition.onstart = () => {
        console.log("Listening...");
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        // Check for wake word using fuzzy matching
        let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
        let closestWakeWord = wakeWords.find(word => levenshteinDistance(transcript, word) <= 2);
        
        if (closestWakeWord) {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");

            let utterance = new SpeechSynthesisUtterance("Voice control activated. How can I assist?");
            speechSynthesis.speak(utterance);
            return;
        }

        // Check for sleep command using fuzzy matching
        let sleepCommands = ["sleep email", "stop email", "turn off email"];
        let closestSleepCommand = sleepCommands.find(word => levenshteinDistance(transcript, word) <= 2);

        if (closestSleepCommand) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");

            let utterance = new SpeechSynthesisUtterance("Voice control deactivated. Say 'Hey email' to reactivate.");
            speechSynthesis.speak(utterance);
            return;
        }

        if (isActive) {
            executeCommand(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showPopup("Error detected", "Error");
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        showPopup("Not listening...", "OFF");

        setTimeout(() => {
            recognition.start();
        }, 1000);
    };

    recognition.start();
}
