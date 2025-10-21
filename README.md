# 📅 Mallet Calendar Sync  
>**Never Miss a 42 Event Ever Again**

A lightweight integration that automatically syncs your **42 Intra events** with **Google Calendar**, so you never have to manually copy event times again.  
Built for the 42 Heilbronn community — by students, for students.

---

## 🚀 Overview

Students at 42 manage dozens of events each week — rushes, exams, workshops, and evaluations — all listed on the Intra platform.  
This tool connects **42 Intra** with **Google Calendar**, allowing one-click subscription and real-time synchronization of events.  

It starts as a **browser extension + Node.js backend** MVP and can evolve into a full-fledged web app.

---

## 🧠 Core Features

✅ **Google Calendar Integration**  
- Secure login via Google OAuth 2.0  
- Automatic event creation, updates, and deletion in your Google Calendar  

🖱️ **Subscribe / Unsubscribe from 42 Intra**  
- Adds a “Subscribe” button next to each 42 event (via the browser extension)  
- Subscribed events appear instantly in Google Calendar  
- Unsubscribed events are removed automatically  

🔄 **Real-Time Sync**  
- Keeps your calendar up to date as events are added or changed  
- Maintains a small local mapping database to avoid duplicates  

🧩 **Simple & Secure**  
- Tokens are safely managed server-side  
- HTTPS, cookies, and encrypted sessions ensure data privacy  

🌍 **Future-Ready (Post-Hackathon)**  
- Two-way synchronization (Google → 42)  
- Batch sync (“Add all Piscine rushes”)  
- Custom reminders & calendar selection  

---

## 🛠️ Tech Stack

**Frontend / Extension**  
- JavaScript / TypeScript  
- HTML + CSS (MV3 Chrome Extension)  

**Backend**  
- Node.js (Express)  
- Google OAuth & Calendar API  
- 42 API Integration  
- SQLite or Redis (for event mapping)  

---

## ⚡ Quick Start (Local Setup)

> Prerequisites: [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
cd <REPO_NAME>
```

### 2. Run setup
```bash
chmod +x setup.sh
./setup.sh
```

This installs dependencies and creates a default .env file.

### 3. Configure your credentials

Follow the step-by-step instructions in SETUP_GUIDE.md
 to generate:

- 42 Intra API credentials: FT_CLIENT_ID, FT_CLIENT_SECRET

- Google Calendar credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

- Then, update your .env file with the generated keys.

### 4. Start the service
```bash
node server.js
```


Once running, open the displayed URL in your browser and connect both 42 and Google accounts.

📜 License

This project is open-source and available under the MIT License.
Contributions, forks, and pull requests are welcome!
