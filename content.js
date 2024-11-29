// content.js

// Check if browser supports SpeechRecognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening for continuous speech
    recognition.lang = 'en-US'; // You can change this to the desired language
    recognition.interimResults = true; // Capture results before speech ends
    recognition.maxAlternatives = 1; // Limit recognition to one result
} else {
    console.log('Speech Recognition API is not supported in this browser.');
}

// Start listening for voice commands when the user clicks a button in the popup or options page
document.getElementById('startVoiceBtn').addEventListener('click', () => {
    recognition.start();
});

// content.js

// Function to interpret and execute voice commands
function handleVoiceCommand(command) {
    if (command.includes('read latest email')) {
        readLatestEmail();
    } else if (command.includes('read email from')) {
        const sender = command.split('from')[1].trim();  // Extract the sender's name or email
        readEmailFrom(sender);
    } else if (command.includes('delete email')) {
        deleteEmail();
    } else if (command.includes('next email')) {
        navigateNextEmail();
    } else if (command.includes('compose email')) {
        composeEmail();
    } else if (command.includes('send email')) {
        sendEmail();
    } else if (command.includes('set subject to')) {
        const subject = command.split('to')[1].trim();
        setSubject(subject);
    } else {
        console.log('Command not recognized.');
    }
}

// Start listening for speech input
recognition.onresult = function(event) {
    const speechResult = event.results[event.resultIndex][0].transcript.toLowerCase();
    console.log('Voice command detected:', speechResult);
    handleVoiceCommand(speechResult);
};

// Provide feedback to the user that the microphone is active
recognition.onstart = function() {
    console.log('Voice recognition started.');
};

recognition.onend = function() {
    console.log('Voice recognition ended.');
};

// Error handling
recognition.onerror = function(event) {
    console.log('Speech recognition error:', event.error);
};

// content.js

// Read the latest email in the inbox
function readLatestEmail() {
    const emailContent = document.querySelector('.email-item:first-child .email-body');  // Update this selector based on your email platform's structure
    if (emailContent) {
        const emailText = emailContent.innerText || emailContent.textContent;
        readOutLoud(emailText);
    } else {
        alert("No emails found to read.");
    }
}

// Read an email from a specific sender
function readEmailFrom(sender) {
    const emails = document.querySelectorAll('.email-item');  // Selector for email items
    emails.forEach(email => {
        const senderText = email.querySelector('.email-sender').innerText;  // Adjust based on the sender's info element
        if (senderText.toLowerCase().includes(sender.toLowerCase())) {
            const emailContent = email.querySelector('.email-body');
            const emailText = emailContent ? emailContent.innerText || emailContent.textContent : 'No content available.';
            readOutLoud(emailText);
        }
    });
}

// Delete the currently opened email
function deleteEmail() {
    const deleteButton = document.querySelector('.delete-button');  // Update the selector based on the email platform
    if (deleteButton) {
        deleteButton.click();
        alert('Email deleted.');
    } else {
        alert('No email selected for deletion.');
    }
}

// Navigate to the next email
function navigateNextEmail() {
    const nextButton = document.querySelector('.next-email-button');  // Update based on email platform's "Next" button
    if (nextButton) {
        nextButton.click();
    } else {
        alert('No next email found.');
    }
}

// Compose a new email
function composeEmail() {
    const composeButton = document.querySelector('.compose-button');  // Adjust based on email platform
    if (composeButton) {
        composeButton.click();
    } else {
        alert('Compose button not found.');
    }
}

// Send the composed email
function sendEmail() {
    const sendButton = document.querySelector('.send-button');  // Update based on the email platform's send button
    if (sendButton) {
        sendButton.click();
        alert('Email sent.');
    } else {
        alert('Send button not found.');
    }
}

// Set the subject of the email
function setSubject(subject) {
    const subjectField = document.querySelector('.subject-field');  // Update based on the email platform
    if (subjectField) {
        subjectField.value = subject;
        alert('Subject set to: ' + subject);
    } else {
        alert('Subject field not found.');
    }
}

// Function to read out text using speech synthesis (Text-to-Speech)
function readOutLoud(text) {
    const speech = new SpeechSynthesisUtterance();
    speech.text = text;
    speech.lang = 'en-US';  // You can change the language as per the user's preference
    window.speechSynthesis.speak(speech);
}
