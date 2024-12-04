// Listen for speech recognition results and handle commands
chrome.runtime.onMessage.addListener((message) => {
    if (message.command === 'compose email') {
      document.querySelector('div[aria-label="Compose"]').click(); // Gmail compose button
    } else if (message.command === 'send email') {
      document.querySelector('div[aria-label="Send ‪(Ctrl-Enter)‬"]').click(); // Gmail send button
    } else if (message.command === 'delete email') {
      document.querySelector('div[aria-label="Delete"]').click(); // Gmail delete button
    } else if (message.command === 'reply email') {
      document.querySelector('div[aria-label="Reply"]').click(); // Gmail reply button
    }
  });
  