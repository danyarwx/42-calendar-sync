## 📅 42 Calendar Sync Tool (Local Service)

This application is a local Node.js service designed to synchronize your future event registrations from the 42 Intra API to your Google Calendar.

## 🚀 Quick Start Guide

Prerequisite: You must have Node.js and Git installed on your Linux machine.

# 1. Clone the repository:

git clone [YOUR_REPO_URL]
cd [YOUR_REPO_NAME]


# 2. Run the setup script:

chmod +x setup.sh
./setup.sh

-> This installs dependencies and creates the necessary .env file.


# 3. Insert API Keys (Crucial Step):

Follow the detailed instructions in the SETUP_GUIDE.md to generate your personal 42 Intra and Google Calendar API keys. You must open the .env file and replace the placeholders.


# 4. Start the Service:

node server.js

-> Open the displayed URL in your browser to begin the synchronization process.


## ⚙️ Core Features (Minimalist View)

-> This tool provides a complete and stable synchronization experience by focusing on these key aspects:


✅ Targeted Events

Synchronizes only events you are registered for (fetched via the events_users endpoint).

➡️ Future-Proof

Only events with a start date in the future are synchronized to keep your calendar clean.

🔄 Dual Sync Mode

You choose: Fully Automatic (all future events at once with duplicate checking) or Manual (web-based selection).

🛡️ Data Integrity

The system uses duplicate checking and solves API issues (like pagination and the missing date filter) to ensure a complete sync.