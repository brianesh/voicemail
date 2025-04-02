const express = require('express');
const fs = require('fs');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// OAuth Configuration
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Load credentials
function loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('Credentials file not found');
    }
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    return credentials.web || credentials.installed; // Support both formats
}

// Initialize OAuth2 client
function getOAuth2Client() {
    const { client_secret, client_id, redirect_uris } = loadCredentials();
    return new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );
}

// Token endpoints for frontend
app.get('/auth/url', (req, res) => {
    const oAuth2Client = getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    res.json({ authUrl });
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code missing' });

    try {
        const oAuth2Client = getOAuth2Client();
        const { tokens } = await oAuth2Client.getToken(code);
        
        // Save token for server use
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        
        // Return tokens to frontend
        res.json({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expiry_date
        });
    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

// Enhanced email fetching
async function getEmails(action = 'unread', accessToken) {
    try {
        let auth;
        
        if (accessToken) {
            // Use frontend-provided token
            auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: accessToken });
        } else {
            // Use server-side token
            auth = getOAuth2Client();
            if (!fs.existsSync(TOKEN_PATH)) throw new Error('No token');
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            auth.setCredentials(token);
        }

        const gmail = google.gmail({ version: 'v1', auth });
        let query = '';

        switch (action) {
            case 'unread': query = 'is:unread'; break;
            case 'trash': query = 'in:trash'; break;
            case 'important': query = 'is:important'; break;
            case 'starred': query = 'is:starred'; break;
            default: query = 'is:unread';
        }

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 5
        });

        if (!res.data.messages) return [];

        const emailPromises = res.data.messages.map(async (msg) => {
            const emailData = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
            });

            const headers = emailData.data.payload.headers;
            const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

            return {
                id: msg.id,
                subject: getHeader('Subject'),
                from: getHeader('From'),
                date: getHeader('Date')
            };
        });

        return await Promise.all(emailPromises);
    } catch (error) {
        console.error('Error fetching emails:', error);
        throw error;
    }
}

// API endpoint
app.get('/api/emails', async (req, res) => {
    try {
        const { action, token } = req.query;
        const emails = await getEmails(action, token);
        res.json({ emails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});