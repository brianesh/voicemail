chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_email_speech_recognition") {
        console.log("Starting Speech Recognition for Email Composition...");

        let recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.start();

        recognition.onresult = function (event) {
            let emailCommand = event.results[0][0].transcript;
            console.log("Email command:", emailCommand);
            alert("You said: " + emailCommand);

            parseEmailCommand(emailCommand);
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

function parseEmailCommand(command) {
    let toMatch = command.match(/to (.+?)(?: subject| body|$)/i);
    let subjectMatch = command.match(/subject (.+?)(?: body|$)/i);
    let bodyMatch = command.match(/body (.+)$/i);
    let ccMatch = command.match(/cc (.+?)(?: subject| body|$)/i);
    let bccMatch = command.match(/bcc (.+?)(?: subject| body|$)/i);

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

    waitForComposeBox(to, cc, bcc, subject, body);
}

// 🛠 **Wait for Gmail compose box to load**
function waitForComposeBox(to, cc, bcc, subject, body) {
    let observer = new MutationObserver(() => {
        let composeBox = document.querySelector("div[role='dialog']");

        if (composeBox) {
            console.log("Compose box detected!");
            observer.disconnect();
            fillGmailComposeFields(to, cc, bcc, subject, body);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// ✅ **Fill Gmail compose fields properly**
function fillGmailComposeFields(to, cc, bcc, subject, body) {
    setTimeout(() => {
        let toField = document.querySelector("textarea[name='to']");
        let subjectField = document.querySelector("input[name='subjectbox']");
        let bodyField = document.querySelector("div[aria-label='Message Body']");
        let ccButton = document.querySelector("span[role='button'][data-tooltip='Add Cc']");
        let bccButton = document.querySelector("span[role='button'][data-tooltip='Add Bcc']");

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
    }, 2000);
}
