const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');
const open = require('open');

// Load client secrets
const credentials = require('./client_secret.json').web;
const oAuth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  'http://localhost:8080/callback' // Must match EXACTLY one of your redirect_uris
);

const TOKEN_PATH = 'token.json';
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent' // Forces refresh token on every auth
  });
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  try {
    const { tokens } = await oAuth2Client.getToken(req.query.code);
    oAuth2Client.setCredentials(tokens);
    
    // Save tokens
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    
    // Use the API
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const messages = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
    
    res.send(`
      <h1>Success!</h1>
      <p>Found ${messages.data.messages?.length || 0} emails</p>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
    `);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send(`<h1>Error</h1><pre>${error.message}</pre>`);
  }
});

// Start server
app.listen(8080, async () => {
  console.log('Server running on http://localhost:8080');
  
  // Auto-open auth page
  try {
    await open('http://localhost:8080/auth');
  } catch (err) {
    console.log('Visit manually: http://localhost:8080/auth');
  }
});