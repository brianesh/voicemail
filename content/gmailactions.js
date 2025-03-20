import { speakText } from "../background/texttospeech.js";

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "fetchEmails") {
    fetchUnreadEmails();
  }
});

function fetchUnreadEmails() {
  const emails = document.querySelectorAll('.zE .bog'); // Unread email subjects
  if (emails.length === 0) {
    speakText("You have no unread emails.");
    return;
  }

  let emailSubjects = [];
  emails.forEach((email, index) => {
    if (index < 3) emailSubjects.push(email.innerText); // Read only top 3
  });

  speakText(`You have ${emails.length} unread emails. The first three are: ${emailSubjects.join(", ")}`);
}
