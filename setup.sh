#!/bin/bash
# setup.sh - Automates dependency installation and .env file creation.

echo "Starting 42 Calendar Sync Setup..."

# 1. Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# 2. Check for .env file and create it if missing
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# 42 Intra API Credentials
# !!! IMPORTANT: REPLACE THE PLACEHOLDERS BELOW WITH YOUR OWN KEYS !!!
UID_42="[INSERT_YOUR_42_APPLICATION_ID_HERE]"
SECRET_42="[INSERT_YOUR_42_SECRET_HERE]"
REDIRECT_URI="http://localhost:3000/callback"

# Google Calendar API Credentials
# !!! IMPORTANT: REPLACE THE PLACEHOLDERS BELOW WITH YOUR OWN KEYS !!!
GOOGLE_CLIENT_ID="[INSERT_YOUR_GOOGLE_CLIENT_ID_HERE]"
GOOGLE_CLIENT_SECRET="[INSERT_YOUR_GOOGLE_CLIENT_SECRET_HERE]"
EOL
    echo ".env file created. Please manually open the file and replace the placeholders."
else
    echo ".env file already exists. Skipping creation."
fi

echo "Setup complete. Start the application with: node server.js"