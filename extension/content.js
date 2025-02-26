chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openInbox") {
      console.log("Opening inbox...");
      window.location.href = "https://mail.google.com/mail/u/0/#inbox";
    } else if (message.action === "composeEmail") {
      console.log("Opening compose email...");
      window.location.href = "https://mail.google.com/mail/u/0/#inbox?compose=new";
    } else {
      console.log("Unknown action:", message.action);
    }
  });
  