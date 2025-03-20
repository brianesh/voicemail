if (!("webkitSpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    let recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    let isListening = true; // Controls if recognition should restart

    recognition.onstart = () => {
        console.log("Listening...");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);

        if (transcript === "hey email") {
            let utterance = new SpeechSynthesisUtterance("Hello, how can I help you?");
            speechSynthesis.speak(utterance);
            isListening = true;
            recognition.start();
        } 
        else if (transcript === "sleep email") {
            let utterance = new SpeechSynthesisUtterance("Going to sleep.");
            speechSynthesis.speak(utterance);
            isListening = false;
            recognition.stop();
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });

        // Restart recognition if still listening
        if (isListening) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    recognition.start();
}
