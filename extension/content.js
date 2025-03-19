chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_email_speech_recognition") {
        console.log("🎤 Listening for email command...");

        let recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.start();

        recognition.onresult = function (event) {
            let emailCommand = event.results[0][0].transcript;
            console.log("📩 Email command:", emailCommand);
            alert("You said: " + emailCommand);

            let sendEmail = emailCommand.toLowerCase().endsWith("send");
            parseEmailCommand(emailCommand, sendEmail);
        };
    }
});
