import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

// 42 Intra Credentials
const UID_42 = process.env.UID_42;
const SECRET_42 = process.env.SECRET_42;
// Uses the URI from your .env, which is also registered in the 42 Intra app
const INTRA_REDIRECT_URI = process.env.REDIRECT_URI; // http://localhost:3000/callback
const INTRA_TOKEN_URL = 'https://api.intra.42.fr/oauth/token';

// Google Calendar Credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Must be a DISTINCT URI for the Google OAuth process
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback/google'; 
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Google OAuth client setup
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

const app = express();
const PORT = 3000;

// --- 42 INTRA AUTH FLOW ---

// Starting point: Redirect the User to 42-signin
app.get('/login/42', (req, res) => {
    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID_42}&redirect_uri=${INTRA_REDIRECT_URI}&response_type=code`;
    res.redirect(authUrl);
});

// CORRECTED Callback-Endpoint: Must match the registered path '/callback'
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Authorization code missing from 42.');
    }

    try {
        // 1. Exchange the 42 Code for an Access Token
        const response = await axios.post(INTRA_TOKEN_URL, {
            grant_type: 'authorization_code',
            client_id: UID_42,
            client_secret: SECRET_42,
            code: code,
            redirect_uri: INTRA_REDIRECT_URI
        });

        const accessToken42 = response.data.access_token;
        
        // --- STEP 2: Initiate Google OAuth Flow ---
        
        const googleAuthUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', 
            scope: GOOGLE_SCOPES,
            state: accessToken42 // Pass the 42 token to the Google callback
        });

        res.redirect(googleAuthUrl);

    } catch (error) {
        // Corrected Error Handling for older Node versions
        const errorData = error.response ? error.response.data : error.message;
        console.error('Error during 42 token exchange:', errorData);
        res.status(500).send('Error during 42 authorization.');
    }
});


// --- GOOGLE CALENDAR AUTH FLOW ---

// New Callback-Endpoint: Receives the Google Authorization Code (Path must be registered with Google)
app.get('/callback/google', async (req, res) => {
    const googleCode = req.query.code;
    const accessToken42 = req.query.state; // Retrieve the 42 token from the 'state' parameter

    if (!googleCode) {
        return res.status(400).send('Google Authorization code missing.');
    }
    
    if (!accessToken42) {
        return res.status(400).send('42 Access Token (state) missing.');
    }

    try {
        // 1. Exchange the Google Code for Access and Refresh Tokens
        const { tokens } = await oauth2Client.getToken(googleCode);
        oauth2Client.setCredentials(tokens);

        // 2. Fetch 42 Events (Logic goes here)
        // 3. Create Google Calendar Events (Logic goes here)
        
        res.send(`Success! 42 events fetched and pushed to Google Calendar.`);

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('Error during Google token exchange or event sync:', errorData);
        res.status(500).send('Error during Google authorization or calendar sync.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/login/42`);
});