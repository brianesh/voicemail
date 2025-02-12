document.addEventListener("DOMContentLoaded", function () {
    let startButton = document.getElementById("start");
    
    if (!startButton) {
        console.error("Button #start not found!");
        return;
    }

    startButton.addEventListener("click", function () {
        console.log("Button clicked! Starting voice recognition...");

        if (!window.webkitSpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        let recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.start();

        recognition.onresult = function (event) {
            let command = event.results[0][0].transcript;
            console.log("Recognized:", command);
            alert("You said: " + command);
        };

        recognition.onerror = function (event) {
            console.error("Speech recognition error:", event.error);
            alert("Speech recognition error: " + event.error);
        };
    });
});
