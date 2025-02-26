chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start_speech") {
      console.log("Starting Speech Recognition...");

      if (!window.webkitSpeechRecognition) {
          alert("Your browser does not support Speech Recognition.");
          return;
      }

      let recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.start();

      console.log("Speech recognition started...");

      recognition.onresult = function (event) {
          let command = event.results[0][0].transcript.toLowerCase();
          console.log("Recognized:", command);
          alert("You said: " + command);

          if (command.includes("open inbox")) {
              window.location.href = "https://mail.google.com/mail/u/0/#inbox";
          } else if (command.includes("compose email")) {
              window.location.href = "https://mail.google.com/mail/u/0/#inbox?compose=new";
          } else if (command.includes("read latest email")) {
              alert("Reading latest email... (Needs Gmail API)");
              // Future: Fetch email from Gmail API
          } else if (command.includes("delete email")) {
              alert("Deleting email... (Needs Gmail API)");
              // Future: Move email to trash
          } else if (command.includes("reply email")) {
              alert("Opening reply mode... (Needs Gmail API)");
              // Future: Open latest email in reply mode
          } else {
              alert("Command not recognized. Try again.");
          }
      };

      recognition.onerror = function (event) {
          console.error("Speech recognition error:", event.error);
          alert("Speech recognition error: " + event.error);
      };

      recognition.onend = function () {
          console.log("Speech recognition ended.");
      };
  }
});
