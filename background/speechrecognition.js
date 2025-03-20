import { speakText } from "./texttospeech.js";

export function startVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    console.error("Speech recognition not supported.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    console.log("Listening for commands...");
  };

  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Command:", command);
    handleCommand(command);
  };

  recognition.onerror = (event) => {
    console.error("Error:", event.error);
    speakText("I didn't catch that. Please try again.");
  };

  recognition.onend = () => {
    console.log("Voice recognition stopped.");
  };

  recognition.start();
}

function handleCommand(command) {
  if (command.includes("compose email")) {
    speakText("Opening Gmail to compose a new email.");
    chrome.tabs.create({ url: "https://mail.google.com/mail/u/0/#inbox?compose=new" });
  } else if (command.includes("read emails")) {
    speakText("Fetching your latest unread emails.");
    chrome.runtime.sendMessage({ action: "fetchEmails" });
  } else if (command.includes("log out")) {
    speakText("Logging you out of Gmail.");
    chrome.tabs.create({ url: "https://accounts.google.com/Logout" });
  } else {
    speakText("Sorry, I didn't understand that.");
  }
}
