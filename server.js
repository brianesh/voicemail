const express = require('express');
const fs = require('fs');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';

// Load credentials
function getOAuth2Client() {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
}

// Fetch emails based on action
async function getEmails(action) {
    try {
        const auth = getOAuth2Client();
        const gmail = google.gmail({ version: 'v1', auth });

        let query = '';
        if (action === 'unread') query = 'is:unread';
        if (action === 'trash') query = 'in:trash';

        const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: action === 'first' ? 1 : 5 });
        if (!res.data.messages) return [];

        const emailPromises = res.data.messages.map(async msg => {
            const emailData = await gmail.users.messages.get({ userId: 'me', id: msg.id });
            const headers = emailData.data.payload.headers;
            const subjectHeader = headers.find(header => header.name === 'Subject');
            return { subject: subjectHeader ? subjectHeader.value : "No Subject" };
        });

        return await Promise.all(emailPromises);
    } catch (error) {
        console.error("Error fetching emails:", error);
        return { error: "Failed to retrieve emails." };
    }
}

// API endpoint
app.get('/emails', async (req, res) => {
    const action = req.query.action;
    const emails = await getEmails(action);
    res.json({ emails });
});

// Start server
app.listen(8080, () => {
    console.log("Server started on http://127.0.0.1:8080");
});
