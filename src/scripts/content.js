console.log("Content script running...");

// Example: Log when a user opens Gmail or Yahoo
if (window.location.hostname.includes("mail.google.com") || window.location.hostname.includes("yahoo.com")) {
  console.log("You are on an email page!");
}
