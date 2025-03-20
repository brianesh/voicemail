if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isListening = true;
    let isActive = false;

    recognition.onstart = () => {
        console.log("Listening...");
        isActive = true;
        chrome.runtime.sendMessage({ action: "updateStatus", status: "ON" });
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);

        if (transcript === "hey email") {
            if (isActive) {
                recognition.stop();
                isActive = false;
            }

            let utterance = new SpeechSynthesisUtterance("Hello, how can I help you?");
            utterance.onend = () => {
                if (isListening && !isActive) {
                    recognition.start();
                }
            };
            speechSynthesis.speak(utterance);
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
        isActive = false;
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });

        if (isListening) {
            setTimeout(() => {
                if (!isActive) {
                    recognition.start();
                }
            }, 1000);
        }
    };

    recognition.start();
}
