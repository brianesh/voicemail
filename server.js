const express = require('express');
const fs = require('fs');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Load credentials
function loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('Missing credentials.json');
    }
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    return credentials.web || credentials.installed;
}

// Initialize OAuth2 client
function getOAuth2Client() {
    const { client_secret, client_id, redirect_uris } = loadCredentials();
    return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

// Token exchange endpoint
app.post('/auth/callback', async (req, res) => {
    try {
        const { code, refresh_token } = req.body;
        const oAuth2Client = getOAuth2Client();
        
        let tokens;
        if (code) {
            // New authorization code flow
            const { tokens: newTokens } = await oAuth2Client.getToken(code);
            tokens = newTokens;
        } else if (refresh_token) {
            // Refresh token flow
            const { tokens: newTokens } = await oAuth2Client.refreshToken(refresh_token);
            tokens = newTokens;
        } else {
            return res.status(400).json({ error: 'Missing token parameters' });
        }

        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        
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

// Email fetching endpoint
app.get('/api/emails', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Missing token' });

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });
        
        const gmail = google.gmail({ version: 'v1', auth });
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
            maxResults: 5
        });

        if (!response.data.messages) return res.json({ emails: [] });

        const emails = await Promise.all(
            response.data.messages.map(async (msg) => {
                const email = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'metadata',
                    metadataHeaders: ['From', 'Subject']
                });
                
                const headers = email.data.payload.headers;
                return {
                    from: headers.find(h => h.name === 'From')?.value || '',
                    subject: headers.find(h => h.name === 'Subject')?.value || ''
                };
            })
        );

        res.json({ emails });
    } catch (error) {
        console.error('Email fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});