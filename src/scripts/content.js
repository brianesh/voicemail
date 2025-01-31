console.log("Content script running...");

if (window.location.hostname.includes("mail.google.com") || window.location.hostname.includes("yahoo.com")) {
  console.log("You are on an email page!");
}
