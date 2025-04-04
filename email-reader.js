const path = require('path');
const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');
const open = require('open');

// Load client secrets
const credentials = require('./client_secret.json').web;
const oAuth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  'http://localhost:8080/callback'
);

const TOKEN_PATH = path.join(__dirname, 'token.json');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check for existing token
function loadSavedTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(tokens);
      return tokens;
    }
  } catch (err) {
    console.error('Error loading tokens:', err);
  }
  return null;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  try {
    if (req.query.error) {
      throw new Error(`OAuth error: ${req.query.error}`);
    }

    if (!req.query.code) {
      throw new Error('No authorization code received');
    }

    const { tokens } = await oAuth2Client.getToken(req.query.code);
    oAuth2Client.setCredentials(tokens);
    
    // Save tokens to file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    
    // Verify token is working
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const messages = await gmail.users.messages.list({ 
      userId: 'me', 
      maxResults: 1 
    });
    
    res.send(`
      <h1>Authentication Successful!</h1>
      <p>Found ${messages.data.messages?.length || 0} emails</p>
      <p>You can now close this window and return to the app.</p>
      <script>
        setTimeout(() => window.close(), 3000);
      </script>
    `);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send(`
      <h1>Authentication Error</h1>
      <p>${error.message}</p>
      <a href="/auth">Try again</a>
    `);
  }
});

// Example protected API endpoint
app.get('/emails', async (req, res) => {
  try {
    // Check if we have valid tokens
    if (!oAuth2Client.credentials.access_token) {
      const tokens = loadSavedTokens();
      if (!tokens?.access_token) {
        return res.redirect('/auth');
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    });

    res.json(messages.data);
  } catch (error) {
    console.error('API error:', error);
    res.status(401).json({ error: 'Authentication required' });
  }
});

// Start server
app.listen(8080, async () => {
  console.log('Server running on http://localhost:8080');
  
  // Try to load saved tokens
  loadSavedTokens();
  
  // Auto-open auth page if no tokens
  if (!oAuth2Client.credentials.access_token) {
    try {
      await open('http://localhost:8080/auth');
    } catch (err) {
      console.log('Visit manually: http://localhost:8080/auth');
    }
  }
});