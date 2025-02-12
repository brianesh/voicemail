document.getElementById("start").addEventListener("click", function() {
    let recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = function(event) {
        let command = event.results[0][0].transcript;
        console.log("Recognized:", command);

        fetch("http://localhost/voice-email-extension/backend/process.php", {
            method: "POST",
            body: JSON.stringify({ command: command }),
            headers: { "Content-Type": "application/json" }
        }).then(response => response.json())
          .then(data => alert("Response: " + data.message));
    };
});
