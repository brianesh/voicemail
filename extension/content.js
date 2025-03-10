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

    fillGmailComposeFields(to, cc, bcc, subject, body);
}

function fillGmailComposeFields(to, cc, bcc, subject, body) {
    setTimeout(() => {
        let toField = document.querySelector("textarea[name='to']");
        let subjectField = document.querySelector("input[name='subjectbox']");
        let bodyField = document.querySelector("div[aria-label='Message Body']");
        let ccButton = document.querySelector("span[role='button'][data-tooltip='Add Cc']");
        let bccButton = document.querySelector("span[role='button'][data-tooltip='Add Bcc']");

        if (toField) toField.value = to;
        if (subjectField) subjectField.value = subject;
        if (bodyField) bodyField.innerText = body;

        if (cc && ccButton) {
            ccButton.click();
            setTimeout(() => {
                let ccField = document.querySelector("textarea[name='cc']");
                if (ccField) ccField.value = cc;
            }, 500);
        }

        if (bcc && bccButton) {
            bccButton.click();
            setTimeout(() => {
                let bccField = document.querySelector("textarea[name='bcc']");
                if (bccField) bccField.value = bcc;
            }, 500);
        }
    }, 2000);
}
