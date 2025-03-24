if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false; // Voice control initially off
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

    function speakMessage(message) {
        let utterance = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utterance);
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

        for (let keyword in commands) {
            if (lowerTranscript.includes(keyword)) {
                showPopup(`Opening ${keyword}...`, "Processing");
                speakMessage(`Opening ${keyword}`);
                setTimeout(() => {
                    window.open(commands[keyword], "_self");
                }, 1500);
                return;
            }
        }

        if (lowerTranscript.includes("read emails")) {
            readEmails();
            return;
        }

        if (lowerTranscript.includes("read unread emails")) {
            readEmails(true);
            return;
        }

        if (lowerTranscript.includes("next email")) {
            triggerKey("j"); // Move to next email
            return;
        }

        if (lowerTranscript.includes("previous email")) {
            triggerKey("k"); // Move to previous email
            return;
        }

        if (lowerTranscript.includes("open email")) {
            triggerKey("o"); // Open email
            return;
        }

        if (lowerTranscript.includes("reply email")) {
            triggerKey("r"); // Reply
            return;
        }

        if (lowerTranscript.includes("delete email")) {
            triggerKey("#"); // Delete
            return;
        }

        showPopup("Unknown command", "Error");
        speakMessage("Sorry, I didn't understand that.");
    }

    function triggerKey(key) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
    }

    function readEmails(unreadOnly = false) {
        let emailList = document.querySelectorAll("tr.zA"); // Gmail email rows
        let emailSubjects = [];

        emailList.forEach((email) => {
            let isUnread = email.classList.contains("zE"); // Unread emails have the "zE" class
            let subject = email.querySelector(".bog")?.innerText || "No subject";

            if (!unreadOnly || isUnread) {
                emailSubjects.push(subject);
            }
        });

        if (emailSubjects.length === 0) {
            speakMessage(unreadOnly ? "No unread emails found." : "No emails found.");
            showPopup("No emails found.", "Error");
        } else {
            let emailText = emailSubjects.join(". Next email. ");
            speakMessage(`You have ${emailSubjects.length} emails. ${emailText}`);
            showPopup("Reading emails...", "Processing");
        }
    }

    recognition.onstart = () => {
        console.log("Listening...");
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        if (transcript === "hey email") {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");
            speakMessage("Voice control activated. How can I assist?");
            return;
        }

        if (transcript === "sleep email") {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speakMessage("Voice control deactivated. Say 'Hey email' to reactivate.");
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
