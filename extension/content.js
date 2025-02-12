console.log("Voice Email Assistant is active on Gmail.");

function startSpeechRecognition() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            console.log("Microphone access granted.");
            stream.getTracks().forEach(track => track.stop()); // Stop mic after checking permission

            let recognition = new webkitSpeechRecognition();
            recognition.lang = "en-US";
            recognition.continuous = true; // Keeps running
            recognition.interimResults = true; // Shows real-time text
            recognition.maxAlternatives = 1; // Use only one result

            recognition.start();
            console.log("Speech recognition started...");

            recognition.onresult = function (event) {
                let command = event.results[0][0].transcript.toLowerCase();
                console.log("Recognized:", command);

                if (command.includes("read my emails")) {
                    alert("Fetching your unread emails...");
                    fetchEmails();
                } else if (command.includes("send email")) {
                    alert("Who do you want to email?");
                } else {
                    alert("Command not recognized.");
                }
            };

            recognition.onerror = function (event) {
                console.error("Speech recognition error:", event.error);
                if (event.error === "no-speech") {
                    alert("No speech detected. Please try again.");
                } else {
                    alert("Speech recognition error: " + event.error);
                }
            };

            recognition.onend = function () {
                console.log("Speech recognition ended. Restarting...");
                recognition.start(); // Restart automatically
            };
        })
        .catch(function (error) {
            console.error("Microphone access denied:", error);
            alert("Please allow microphone access in Chrome settings.");
        });
}
