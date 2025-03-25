const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Load client secrets from a file
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));

// Scopes for Gmail API (read-only access)
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Authorize the client
async function authorize() {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check for previously stored token
    const tokenPath = 'token.json';
    if (fs.existsSync(tokenPath)) {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(tokenPath)));
        return oAuth2Client;
    }

    return getAccessToken(oAuth2Client);
}

// Get Access Token
function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this URL:', authUrl);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(tokenPath, JSON.stringify(token));
            console.log('Token stored to', tokenPath);
        });
    });
}

// Fetch the first email in inbox
async function readFirstEmail(auth) {
    const gmail = google.gmail({ version: 'v1', auth });

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
}

// Text-to-Speech
function speak(text) {
    const say = require('say');
    say.speak(text);
}

// Run the script
authorize().then(readFirstEmail).catch(console.error);
