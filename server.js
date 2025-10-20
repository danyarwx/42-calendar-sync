import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

// 42 Intra Credentials
const UID_42 = process.env.UID_42;
const SECRET_42 = process.env.SECRET_42;
const INTRA_REDIRECT_URI = process.env.REDIRECT_URI; // Your registered 42 callback
const INTRA_TOKEN_URL = 'https://api.intra.42.fr/oauth/token';

// Google Calendar Credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
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

// -----------------------------------------------------------
// --- 42 INTRA AUTH FLOW ---
// -----------------------------------------------------------

// Starting point: Redirect the User to 42-signin
app.get('/login/42', (req, res) => {
    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID_42}&redirect_uri=${INTRA_REDIRECT_URI}&response_type=code`;
    res.redirect(authUrl);
});

// Callback-Endpoint: Receives the 42-Authorization Code
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
        
        // 2. Initiate Google OAuth Flow, passing the 42 token via the 'state' parameter
        const googleAuthUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', 
            scope: GOOGLE_SCOPES,
            state: accessToken42
        });

        res.redirect(googleAuthUrl);

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('Error during 42 token exchange:', errorData);
        res.status(500).send('Error during 42 authorization.');
    }
});

// -----------------------------------------------------------
// --- GOOGLE CALENDAR AUTH & SYNC FLOW ---
// -----------------------------------------------------------

app.get('/callback/google', async (req, res) => {
    const googleCode = req.query.code;
    const accessToken42 = req.query.state; // The 42 token passed from the previous step

    if (!googleCode || !accessToken42) {
        return res.status(400).send('Missing authorization data.');
    }

    try {
        // 1. Exchange the Google Code for Access and Refresh Tokens
        const { tokens } = await oauth2Client.getToken(googleCode);
        oauth2Client.setCredentials(tokens);
        
        // --- 2. Fetch 42 Events (Requires User ID) ---
        
        const intraApi = axios.create({
            baseURL: 'https://api.intra.42.fr/v2',
            headers: { Authorization: `Bearer ${accessToken42}` }
        });

        // 2a. Fetch user ID first to build the correct event URL
        const userResponse = await intraApi.get('/me');
        const userId = userResponse.data.id;
        
        // 2b. Use the User ID to fetch user-specific event registrations (events_users)
        const events42Response = await intraApi.get(`/users/${userId}/events_users`, {
            params: {
                filter: { future: true } // Only fetch upcoming events
            }
        });
        const events42 = events42Response.data;

        // --- 3. Process and Convert Events for Google Calendar ---
        
        const calendarEvents = events42
            // Filter: Only include entries that contain an actual 'event' object
            .filter(eventUser => eventUser.event)
            // Map: Extract the nested 'event' object for processing
            .map(eventUser => {
                const event42 = eventUser.event; 
                
                // Calculate duration in hours
                const durationHours = event42.duration ? event42.duration / 3600 : 'N/A';
                
                const description = `Duration: ${durationHours} hours.\nLocation: ${event42.location || 'N/A'}\n\n${event42.description || ''}`;

                return {
                    summary: `42: ${event42.name}`,
                    location: event42.location || 'N/A',
                    description: description,
                    start: {
                        dateTime: event42.begin_at, // ISO 8601 format from 42
                        timeZone: 'Europe/Berlin', 
                    },
                    end: {
                        dateTime: event42.end_at,
                        timeZone: 'Europe/Berlin',
                    },
                    reminders: { useDefault: true },
                    source: {
                        title: '42 Intra',
                        url: `https://projects.intra.42.fr/events/${event42.id}`,
                    }
                };
            });

        // --- 4. Insert Events into Google Calendar ---
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        let createdCount = 0;

        for (const event of calendarEvents) {
            try {
                await calendar.events.insert({
                    calendarId: 'primary', // Use the primary calendar of the authenticated user
                    resource: event,
                });
                createdCount++;
            } catch (insertError) {
                // Log and ignore specific insertion errors (e.g., event already exists)
                console.warn(`Event creation failed for ${event.summary}:`, insertError.message);
            }
        }
        
        // --- 5. Success Message ---
        
        res.send(`Success! ${createdCount} 42 events have been synced to your Google Calendar.`);

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('Error during Google token exchange or event sync:', errorData);
        res.status(500).send('Error during Google authorization or calendar sync.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/login/42`);
});