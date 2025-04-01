const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');
const open = require('open');
const path = require('path');
const http = require('http');

// Load client secrets
let credentials;
try {
    credentials = JSON.parse(fs.readFileSync('client_secret.json'));
} catch (err) {
    console.error("Error: 'client_secret.json' file not found. Please make sure it exists.");
    process.exit(1);
}

// Extract credentials from `web`
const { client_secret, client_id, redirect_uris } = credentials.web;
const REDIRECT_URI = redirect_uris[0]; // Use the first redirect URI
const TOKEN_PATH = 'token.json';

// Express app for handling OAuth callback
const app = express();
let oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

// Middleware to parse query parameters
app.use(express.urlencoded({ extended: true }));

// OAuth Authentication Route
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send("Error: No code received.");
    }

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.send("Authentication successful! You can close this window.");
    } catch (err) {
        console.error("Error retrieving access token:", err.message);
        res.send("Authentication failed.");
    }
});

// Fetch first email
async function readFirstEmail() {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

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
    } catch (err) {
        console.error('Error fetching emails:', err.message);
    }
}

// Start Authentication
async function authorize() {
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);
            console.log("Using stored token.");
            return readFirstEmail();
        } catch (err) {
            console.error("Error reading token file. Re-authenticating...");
            fs.unlinkSync(TOKEN_PATH);
        }
    }

    // Open authentication URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });

    console.log("Authorize this app by visiting this URL:", authUrl);
    await open(authUrl);
}

// Start Express server
const server = http.createServer(app);
server.listen(8080, () => {
    console.log("Server started on http://127.0.0.1:8080");
    authorize();
});
