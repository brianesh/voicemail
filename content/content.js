if (!("webkitSpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    let recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

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
        }
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
        chrome.runtime.sendMessage({ action: "updateStatus", status: "OFF" });
    };

    recognition.start();
}
