import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

// 42 Intra Credentials
const UID_42 = process.env.UID_42;
const SECRET_42 = process.env.SECRET_42;
const INTRA_REDIRECT_URI = process.env.REDIRECT_URI;
const INTRA_TOKEN_URL = 'https://api.intra.42.fr/oauth/token';

// Google Calendar Credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback/google'; 
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

// Google OAuth client setup
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

const app = express();
const PORT = 3000;

// --- NEW HELPER FUNCTION FOR DUPLICATE CHECK ---

/**
 * Checks if a 42 event already exists in Google Calendar based on the 42 event ID.
 * @param {object} calendar - The Google Calendar API client instance.
 * @param {string} eventId42 - The numerical ID of the 42 event.
 * @returns {Promise<boolean>} True if the event exists, false otherwise.
 */
async function eventExists(calendar, eventId42) {
    // The 42 event ID is stored in the source URL field: https://projects.intra.42.fr/events/ID
    const urlFilter = `https://projects.intra.42.fr/events/${eventId42}`;

    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            // Search criteria: Look for a matching URL in the source field
            q: urlFilter, 
            // We only need 1 result max
            maxResults: 1, 
            // Only list events that haven't been deleted
            showDeleted: false, 
        });

        // If items are returned, the event exists.
        return response.data.items && response.data.items.length > 0;

    } catch (error) {
        console.error('Error checking for existing event:', error.message);
        // Assume event does not exist if API call fails (safer than stopping the sync)
        return false; 
    }
}

// -----------------------------------------------------------
// --- 42 INTRA AUTH FLOW (UNCHANGED) ---
// -----------------------------------------------------------

// Starting point: Redirect the User to 42-signin
app.get('/login/42', (req, res) => {
    // Determine auto_sync status
    const autoSyncFlag = req.query.auto_sync === 'true' ? 'true' : 'false';
    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID_42}&redirect_uri=${INTRA_REDIRECT_URI}&response_type=code&state=${autoSyncFlag}`;
    
    res.redirect(authUrl);
});

// Callback-Endpoint: Receives the 42-Authorization Code
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const autoSyncFlag = req.query.state || 'false'; 

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
        
        // 2. Combine 42 token and auto_sync flag into one state string for Google
        const stateData = `${accessToken42}|${autoSyncFlag}`;

        // 3. Initiate Google OAuth Flow, passing the combined state
        const googleAuthUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', 
            scope: GOOGLE_SCOPES,
            state: stateData
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
    
    // Split the combined state parameter
    const stateParts = req.query.state ? req.query.state.split('|') : [];
    const accessToken42 = stateParts[0];
    const autoSync = stateParts.length > 1 ? stateParts[1] === 'true' : false; 

    if (!googleCode || !accessToken42) {
        return res.status(400).send('Missing authorization data (Google Code or 42 Token).');
    }

    try {
        // 1. Exchange the Google Code for Access and Refresh Tokens
        const { tokens } = await oauth2Client.getToken(googleCode);
        oauth2Client.setCredentials(tokens);
        const googleAccessToken = tokens.access_token;
        
        // --- 2. Fetch 42 Events ---
        
        const intraApi = axios.create({
            baseURL: 'https://api.intra.42.fr/v2',
            headers: { Authorization: `Bearer ${accessToken42}` }
        });

        const userResponse = await intraApi.get('/me');
        const userId = userResponse.data.id;
        
        const events42Response = await intraApi.get(`/users/${userId}/events_users`, {
            params: {
                'page[size]': 100,
            }
        });
        const events42 = events42Response.data;

        // --- 3. Process and Convert Events for Google Calendar ---
        
        const now = new Date(); 

        const calendarEvents = events42
            .filter(eventUser => eventUser.event) 
            // Client-Side Filtering: Keep only events where BEGIN_AT is in the future
            .filter(eventUser => {
                const eventDate = new Date(eventUser.event.begin_at);
                return eventDate > now;
            })
            .map(eventUser => {
                const event42 = eventUser.event; 
                
                const durationHours = event42.duration ? event42.duration / 3600 : 'N/A';
                
                const description = `Duration: ${durationHours} hours.\nLocation: ${event42.location || 'N/A'}\n\n${event42.description || ''}`;

                return {
                    summary: `42: ${event42.name}`, 
                    location: event42.location || 'N/A',
                    description: description,
                    start: {
                        dateTime: event42.begin_at, 
                        timeZone: 'UTC', 
                    },
                    end: {
                        dateTime: event42.end_at, 
                        timeZone: 'UTC',
                    },
                    reminders: { useDefault: true },
                    source: {
                        title: '42 Intra',
                        url: `https://projects.intra.42.fr/events/${event42.id}`,
                    }
                };
            });

        // --- 4. Decision: Sync or Show Confirmation ---
        
        if (autoSync) {
            // AUTOMATIC MODE: Insert all events immediately with Duplicate Check
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            let createdCount = 0;
            let skippedCount = 0; // NEW: Counter for skipped duplicates

            for (const event of calendarEvents) {
                const eventId42 = event.source.url.split('/').pop();
                
                // NEW: CHECK FOR DUPLICATES
                if (await eventExists(calendar, eventId42)) {
                    console.log(`Skipping duplicate event: ${event.summary}`);
                    skippedCount++;
                    continue; // Skip insertion
                }

                try {
                    await calendar.events.insert({
                        calendarId: 'primary',
                        resource: event,
                    });
                    createdCount++;
                } catch (insertError) {
                    console.warn(`Event creation failed for ${event.summary}:`, insertError.message);
                }
            }
            
            res.send(`Success! ${createdCount} 42 events have been synced automatically to your Google Calendar. (${skippedCount} duplicates skipped)`);
        
        } else {
            // INTERACTIVE MODE (UNCHANGED)
            
            if (calendarEvents.length === 0) {
                 return res.send('No future 42 events found that require syncing.');
            }
            
            const eventListHtml = calendarEvents.map(event => {
                const eventId = event.source.url.split('/').pop(); 
                return `
                <li>
                    ${event.summary} (${event.start.dateTime.split('T')[0]} at ${event.start.dateTime.split('T')[1].substring(0, 5)}h)
                    <a href="/sync/single?token=${accessToken42}&event_id=${eventId}&google_access_token=${googleAccessToken}"> [Add to Google Calendar] </a>
                </li>`
            }).join('');
            
            res.send(`
                <h1>Confirm Events to Sync</h1>
                <p>You are about to sync ${calendarEvents.length} future 42 events:</p>
                <ul>${eventListHtml}</ul>
                <hr>
                <p>To fully sync all these events at once, click here: 
                <a href="/login/42?auto_sync=true">Sync all events now</a></p>
                
                <h3>Future: Automatic Sync</h3>
                <p>To enable permanent automatic sync (the "Haken"), you would start the process via this link:
                <a href="/login/42?auto_sync=true">http://localhost:3000/login/42?auto_sync=true</a></p>
            `);
        }

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('Error during Google token exchange or event sync:', errorData);
        res.status(500).send('Error during Google authorization or calendar sync.');
    }
});

// New Endpoint Simulation: Handles single event synchronization
app.get('/sync/single', async (req, res) => {
    // This uses the passed Access Token (valid for ~1 hour) to authorize Google
    const accessToken42 = req.query.token;
    const eventId = req.query.event_id;
    const googleAccessToken = req.query.google_access_token; 

    if (!accessToken42 || !eventId || !googleAccessToken) {
        return res.status(400).send('Missing required parameters for single sync.');
    }

    try {
        // Authorize Google client using the Access Token
        oauth2Client.setCredentials({ access_token: googleAccessToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client }); // Initialize calendar client

        // NEW: CHECK FOR DUPLICATES
        if (await eventExists(calendar, eventId)) {
            return res.send(`Event ID ${eventId} is already synced to your calendar. (Duplicate skipped)`);
        }

        // Fetch the single event data from 42 API
        const intraApi = axios.create({
            baseURL: 'https://api.intra.42.fr/v2',
            headers: { Authorization: `Bearer ${accessToken42}` }
        });

        // Fetch the event directly by ID
        const event42Response = await intraApi.get(`/events/${eventId}`);
        const event42 = event42Response.data;

        // Convert the single event
        const durationHours = event42.duration ? event42.duration / 3600 : 'N/A';
        const description = `Duration: ${durationHours} hours.\nLocation: ${event42.location || 'N/A'}\n\n${event42.description || ''}`;

        const calendarEvent = {
            summary: `42: ${event42.name}`,
            location: event42.location || 'N/A',
            description: description,
            start: {
                dateTime: event42.begin_at, 
                timeZone: 'UTC', 
            },
            end: {
                dateTime: event42.end_at,
                timeZone: 'UTC',
            },
            reminders: { useDefault: true },
            source: {
                title: '42 Intra',
                url: `https://projects.intra.42.fr/events/${event42.id}`,
            }
        };

        // Insert the single event into Google Calendar
        await calendar.events.insert({
            calendarId: 'primary',
            resource: calendarEvent,
        });

        res.send(`Success! Single event "${calendarEvent.summary}" has been synced to your Google Calendar.`);

    } catch (error) {
        console.error('Error during single event sync:', error.message);
        res.status(500).send(`Error syncing single event. Check console for details.`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/login/42`);
    console.log(`For automatic sync: http://localhost:3000/login/42?auto_sync=true`);
});