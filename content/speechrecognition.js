if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isListening = true;
    let isActive = false;

    // Create Floating Popup
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.8);
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
        }, 4000);
    }

    recognition.onstart = () => {
        console.log("Listening...");
        isActive = true;
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);

        showPopup(transcript, "ON");

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
        showPopup("Not listening...", "OFF");

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
