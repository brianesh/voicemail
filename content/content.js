chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "readEmails") {
      readEmails();
    } else if (message.action === "composeEmail") {
      composeEmail();
    }
  });
  
  function readEmails() {
    let emails = document.querySelectorAll(".zA .y6 span");
    let emailText = Array.from(emails).slice(0, 5).map(email => email.textContent).join(", ");
    speak(emailText || "No new emails.");
  }
  
  function composeEmail() {
    let composeButton = document.querySelector(".T-I.T-I-KE.L3");
    if (composeButton) {
      composeButton.click();
      speak("Composing new email. Please dictate your message.");
    } else {
      speak("Could not find compose button.");
    }
  }
  
  function speak(text) {
    chrome.runtime.sendMessage({ action: "speakText", text });
  }
  