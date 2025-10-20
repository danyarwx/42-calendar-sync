import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const INTRA_TOKEN = process.env.INTRA_TOKEN;

async function get42Events() {
    try {
        const response = await axios.get("https://api.intra.42.fr/v2/me/events", {
            headers: {
                Authorization: `Bearer ${INTRA_TOKEN}`,
            },
        });

        const events = response.data;

        console.log("You have following 42 Events:", events);
        for (const event of events) {
            console.log(`- ${event.name} (${event.begin_at} -> ${event.end_at})`);
        }
    } catch (error) {
        const status = error.response ? error.response.status : 'N/A';
        const data = error.response ? error.response.data : 'N/A';
        console.error("Error fetching 42 events:", status, data);
    }
}

get42Events();