# Astra Musica Competition Platform

A complete competition platform for Astra Musica with Facebook integration, judge scoring, and public leaderboards.

## Features

- **Facebook Auto-Polling**: Automatically pulls posts from your Facebook page every 10 minutes
- **4 Division Top 20s**: English (Red), Afrikaans (Green), Gospel (Brown), Praise & Worship (Purple)
- **2 Weekly Challenges**: English Challenge & Afrikaans Challenge
- **Entry Limits**: 2 Top 20 entries + 1 Challenge entry per member per week
- **Blind Judging**: 4 criteria (Vocals, Production, Originality, Impact) scored 0-10, auto-converted to %
- **Results Reveal**: Admin-controlled reveal with countdown timer
- **Brand Colors**: King's Blue (#4169E1) + Gold (#D4AF37) with division-specific colors

## Quick Deploy to Render

### Step 1: Create a new Web Service on Render

1. Go to [render.com](https://render.com) and create a new account (free)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo or use **Deploy from Git URL**
4. If you don't have a repo, create one and upload these files

### Step 2: Configure Build Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node

### Step 3: Add Environment Variables

In Render dashboard → Environment, add:

```
FB_PAGE_ID=your_facebook_page_id
FB_ACCESS_TOKEN=your_page_access_token
```

### Step 4: Get Facebook Credentials

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an app → Select "Business" type
3. Add "Facebook Login" and "Pages API" products
4. Get a **Page Access Token** with `pages_read_engagement` permission:
   - Go to Graph API Explorer
   - Select your app
   - Get Token → Page Access Token
   - Select your Astra Musica page
   - Copy the token

### Step 5: Deploy

Click "Deploy" on Render. Your app will be live at `https://your-app.onrender.com`.

## Usage

### Judge Login
- Go to `/` and select "Judge"
- Demo passwords: `judge1`, `judge2`, `judge3`, `judge4`
- Each judge sees only their division's submissions

### Admin Panel
- Select "Admin" (no password required in demo)
- View all submissions, scores, and member entry limits
- Click "Reveal results now" to unlock public results

### Public View
- No login required
- Browse Top 20s, Challenges, and Final Results
- Results are hidden until admin reveals them

## File Structure

```
astra-musica-platform/
├── server.js          # Express backend + Facebook polling
├── package.json       # Dependencies
├── .env.example       # Environment variables template
├── public/
│   ├── index.html     # Main frontend
│   ├── app.js         # Frontend logic
│   └── style.css      # Brand colours and layout
└── README.md
```

## Next Steps (Production)

1. **Add Firebase**: Replace in-memory storage with Firestore
2. **Add Authentication**: Use Firebase Auth for judge login
3. **Public Website**: Deploy a separate Vercel site that reads from the same API
4. **Custom Domain**: Point `astramusica.com` to your Render app

## Support

For issues or questions, check the browser console for errors or review the server logs on Render.
