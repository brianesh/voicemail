const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Load client secrets
let credentials;
try {
    credentials = JSON.parse(fs.readFileSync('client_secret.json'));
} catch (err) {
    console.error("Error: 'client_secret.json' file not found. Please make sure it exists.");
    process.exit(1);
}

// Scopes for Gmail API (read-only access)
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';

// Authorize the client
async function authorize() {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    if (!redirect_uris || redirect_uris.length === 0) {
        console.error("Error: No redirect URIs found in 'client_secret.json'.");
        process.exit(1);
    }

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check for previously stored token
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        } catch (err) {
            console.error("Error reading token file. Deleting and re-authenticating.");
            fs.unlinkSync(TOKEN_PATH);
        }
    }

    return getAccessToken(oAuth2Client);
}

// Get Access Token
function getAccessToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this URL:\n', authUrl);

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error('Error retrieving access token:', err.message);
                    return reject(err);
                }
                oAuth2Client.setCredentials(token);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                console.log('Token stored to', TOKEN_PATH);
                resolve(oAuth2Client);
            });
        });
    });
}

// Fetch the first email in inbox
async function readFirstEmail(auth) {
    const gmail = google.gmail({ version: 'v1', auth });

    try {
        const res = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
        if (!res.data.messages || res.data.messages.length === 0) {
            console.log('No emails found.');
            return;
        }

        const messageId = res.data.messages[0].id;
        const message = await gmail.users.messages.get({ userId: 'me', id: messageId });

        const emailData = message.data.payload.headers.find(header => header.name === 'Subject');
        const subject = emailData ? emailData.value : "No Subject";

        console.log(`First email subject: ${subject}`);

        // Read email content aloud using TTS
        const emailText = `Your first email subject is: ${subject}`;
        speak(emailText);
    } catch (err) {
        console.error('Error fetching emails:', err.message);
    }
}

// Text-to-Speech
function speak(text) {
    try {
        const say = require('say');
        say.speak(text);
    } catch (err) {
        console.error('Error using Text-to-Speech:', err.message);
    }
}

// Run the script
authorize().then(readFirstEmail).catch(console.error);
