chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "process_command") {
      console.log("Processing command:", message.command);

      let action = null;
      if (message.command.includes("open inbox")) {
          action = "openInbox";
      } else if (message.command.includes("compose email")) {
          action = "composeEmail";
      }

      if (action) {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
              if (tabs.length === 0) {
                  console.error("No active tab found!");
                  return;
              }
              chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  function: executeCommand,
                  args: [action]
              });
          });
      }
  }
});

function executeCommand(action) {
  if (action === "openInbox") {
      console.log("Opening inbox...");
      location.assign("https://mail.google.com/mail/u/0/#inbox");
  } else if (action === "composeEmail") {
      console.log("Opening compose email...");
      location.assign("https://mail.google.com/mail/u/0/#inbox?compose=new");
  } else {
      console.log("Unknown action:", action);
  }
}
