const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load credentials
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync('client_secret.json'));
} catch (err) {
  console.error("Error loading client_secret.json:", err);
  process.exit(1);
}

const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0] || 'http://localhost:8080/callback'
);

// Token storage
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Store pending auth states
const authStates = new Map();

// Routes
app.get('/auth', (req, res) => {
  const { returnTo } = req.query;
  const state = Math.random().toString(36).substring(2, 15);
  
  authStates.set(state, { 
    returnTo: returnTo || 'https://mail.google.com',
    timestamp: Date.now()
  });

  // Clean up old states
  cleanupAuthStates();

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    state: state,
    prompt: 'consent'
  });

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.status(400).send(`Authentication failed: ${error}`);
  }

  if (!authStates.has(state)) {
    return res.status(400).send('Invalid state parameter');
  }

  const { returnTo } = authStates.get(state);
  authStates.delete(state);

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save tokens for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    // Redirect back to Gmail with tokens in URL fragment
    const tokenParams = new URLSearchParams({
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope
    });

    res.redirect(`${returnTo}#${tokenParams.toString()}`);
  } catch (err) {
    console.error('Error getting tokens:', err);
    res.status(500).send('Authentication failed');
  }
});

// Helper function to clean up old states
function cleanupAuthStates() {
  const now = Date.now();
  for (const [state, { timestamp }] of authStates) {
    if (now - timestamp > 3600000) { // 1 hour
      authStates.delete(state);
    }
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`OAuth server running on http://localhost:${PORT}`);
  console.log('Make sure this matches your Google Cloud Console redirect URIs');
});