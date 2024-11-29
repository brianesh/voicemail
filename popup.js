document.getElementById("start-listening").addEventListener("click", () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      console.log("Microphone access granted");
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.lang = "en-US";

      recognition.onstart = () => {
        console.log("Listening...");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById("result-box").innerText = `You said: ${transcript}`;
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.start();
    })
    .catch((error) => {
      console.error("Microphone access denied:", error);
      alert("Please enable microphone access in your browser settings.");
    });
});
