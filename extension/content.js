chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_speech_recognition") {
        console.log("Starting Speech Recognition in the active tab...");

        if (!window.webkitSpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true }) // Request microphone access
            .then((stream) => {
                let recognition = new webkitSpeechRecognition();
                recognition.lang = "en-US";
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.start();

                recognition.onresult = function (event) {
                    let command = event.results[0][0].transcript;
                    console.log("Recognized:", command);
                    alert("You said: " + command);

                    if (command.toLowerCase().includes("compose email")) {
                        chrome.runtime.sendMessage({ action: "start_email_composition" });
                    } else {
                        chrome.runtime.sendMessage({ action: "process_command", command: command });
                    }
                };

                recognition.onerror = function (event) {
                    console.error("Speech recognition error:", event.error);
                    alert("Speech recognition error: " + event.error);
                };

                recognition.onend = function () {
                    console.log("Speech recognition ended.");
                };
            })
            .catch((error) => {
                console.error("Microphone access denied:", error);
                alert("Microphone access denied. Please enable it in Chrome settings.");
            });
    }

    if (message.action === "start_email_speech_recognition") {
        console.log("Starting Speech Recognition for Email Composition...");

        navigator.mediaDevices.getUserMedia({ audio: true }) // Request microphone access again
            .then((stream) => {
                let recognition = new webkitSpeechRecognition();
                recognition.lang = "en-US";
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.start();

                recognition.onresult = function (event) {
                    let emailCommand = event.results[0][0].transcript;
                    console.log("Email command:", emailCommand);
                    alert("You said: " + emailCommand);

                    let sendEmail = emailCommand.toLowerCase().endsWith("send"); // Check if user said "send"
                    parseEmailCommand(emailCommand, sendEmail);
                };

                recognition.onerror = function (event) {
                    console.error("Speech recognition error:", event.error);
                    alert("Speech recognition error: " + event.error);
                };

                recognition.onend = function () {
                    console.log("Speech recognition ended.");
                };
            })
            .catch((error) => {
                console.error("Microphone access denied:", error);
                alert("Microphone access denied. Please enable it in Chrome settings.");
            });
    }
});

function parseEmailCommand(command, sendEmail) {
    let toMatch = command.match(/to (.+?)(?: subject| body| send|$)/i);
    let subjectMatch = command.match(/subject (.+?)(?: body| send|$)/i);
    let bodyMatch = command.match(/body (.+?)(?: send|$)/i);
    let ccMatch = command.match(/cc (.+?)(?: subject| body| send|$)/i);
    let bccMatch = command.match(/bcc (.+?)(?: subject| body| send|$)/i);

    let to = toMatch ? toMatch[1].trim() : "";
    let subject = subjectMatch ? subjectMatch[1].trim() : "";
    let body = bodyMatch ? bodyMatch[1].trim() : "";
    let cc = ccMatch ? ccMatch[1].trim() : "";
    let bcc = bccMatch ? bccMatch[1].trim() : "";

    console.log("Extracted Email Details:");
    console.log("To:", to);
    console.log("CC:", cc);
    console.log("BCC:", bcc);
    console.log("Subject:", subject);
    console.log("Body:", body);
    console.log("Send Email:", sendEmail);

    waitForComposeBox(to, cc, bcc, subject, body, sendEmail);
}

function waitForComposeBox(to, cc, bcc, subject, body, sendEmail) {
    let observer = new MutationObserver(() => {
        let composeBox = document.querySelector("div[role='dialog']");
        if (composeBox) {
            console.log("Compose box detected!");
            observer.disconnect();
            fillGmailComposeFields(to, cc, bcc, subject, body, sendEmail);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function fillGmailComposeFields(to, cc, bcc, subject, body, sendEmail) {
    setTimeout(() => {
        let toField = document.querySelector("textarea[name='to']");
        let subjectField = document.querySelector("input[name='subjectbox']");
        let bodyField = document.querySelector("div[aria-label='Message Body']");
        let ccButton = document.querySelector("span[role='button'][data-tooltip='Add Cc']");
        let bccButton = document.querySelector("span[role='button'][data-tooltip='Add Bcc']");
        let sendButton = document.querySelector("div[role='button'][data-tooltip^='Send']"); // Gmail Send Button

        if (toField) {
            toField.focus();
            toField.value = to;
            toField.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (subjectField) {
            subjectField.focus();
            subjectField.value = subject;
            subjectField.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (bodyField) {
            bodyField.focus();
            document.execCommand("insertText", false, body);
        }

        if (cc && ccButton) {
            ccButton.click();
            setTimeout(() => {
                let ccField = document.querySelector("textarea[name='cc']");
                if (ccField) {
                    ccField.focus();
                    ccField.value = cc;
                    ccField.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }, 500);
        }

        if (bcc && bccButton) {
            bccButton.click();
            setTimeout(() => {
                let bccField = document.querySelector("textarea[name='bcc']");
                if (bccField) {
                    bccField.focus();
                    bccField.value = bcc;
                    bccField.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }, 500);
        }

        console.log("Email fields filled!");

        if (sendEmail && sendButton) {
            console.log("Sending email...");
            setTimeout(() => {
                sendButton.click();
                alert("Email sent successfully!");
            }, 1500); 
        }
    }, 2000);
}
