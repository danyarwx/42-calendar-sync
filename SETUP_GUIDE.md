# 🔑 API Key Generation Guide

This tool requires personal API credentials to connect your 42 Intra account and your Google Calendar. You must obtain these keys and add them to the .env file created during the Quick Start.

## 1. 42 Intra API Setup (UID & Secret)

You must register this application on your 42 Intra profile to get the necessary access codes.

 - Navigate to your 42 Intra profile and find the API or Applications section.

 - Click to Create a New Application.

 - Set the following critical parameters exactly as shown:
    Name: Calendar Sync Tool (or similar)
   
    Redirect URI: http://localhost:3000/callback
   
    After creation, copy the two generated values:
   
    Application ID (Copy this value for UID_42 in .env)
   
    Secret (Copy this value for SECRET_42 in .env)

## 2. Google Calendar API Setup (Client ID & Secret)

You need to create a project in the Google Cloud Console to enable calendar access.

 - Go to the Google Cloud Console and create a new project.

 - Search for and enable the Google Calendar API for your new project.

 - Navigate to the Credentials section and click Create Credentials -> OAuth 2.0 Client ID.

 - Configure the credentials as follows:

 - Application Type: Web application

 - Authorized redirect URIs: http://localhost:3000/callback/google (Must match the URI in server.js)

 - Save the application and copy the two generated values:

 - Client ID (Copy this value for GOOGLE_CLIENT_ID in .env)

 - Client Secret (Copy this value for GOOGLE_CLIENT_SECRET in .env)

## 3. Finalizing the .env File

Open the .env file that the setup.sh script created and paste your six keys, replacing the placeholders.

 - Example /.env structure:

## 42 Intra API Credentials

UID_42="YOUR_42_APPLICATION_ID_HERE"

SECRET_42="YOUR_42_SECRET_HERE"

REDIRECT_URI="http://localhost:3000/callback"

## Google Calendar API Credentials

GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"

GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
