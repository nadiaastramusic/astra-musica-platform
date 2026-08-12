# Astra Musica Competition Platform

Complete deployment-ready music competition platform for Render.

## What's Included

- **Node.js/Express backend** with REST API
- **Facebook Page polling** (auto-pulls posts every 10 min when configured)
- **Manual submission form** (works immediately without Facebook API)
- **Judge portal** with blind scoring (4 criteria → percentage)
- **Public website** with 4 separate Top 20s + 2 Challenge leaderboards
- **Admin panel** with entry limits, reveal control, and manual add
- **Astra Musica brand colours** (King's Blue + Gold + division colours)

## File Structure

```
astra-musica-platform/
├── server.js          # Express backend + API
├── package.json       # Dependencies
└── public/            # Frontend
    ├── index.html     # Main app
    ├── app.js         # Frontend logic
    └── style.css      # Brand styling
```

## Deploy to Render (Step by Step)

### 1. Upload to GitHub
- Create a new repo on GitHub (e.g. `astra-musica-platform`)
- Upload **all 5 files** from this folder
- Make sure `server.js` and `package.json` are at the **top level** (not inside another folder)

### 2. Create Web Service on Render
- Go to [render.com](https://render.com) → New + → Web Service
- Connect your GitHub repo
- **Language**: Select **Node**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `.` (or leave empty)
- Click Create Web Service

### 3. Add Environment Variables (Optional)
If you want Facebook auto-polling:
- In Render dashboard → your service → Environment
- Add:
  - `FB_PAGE_ID` = your Facebook Page ID (e.g. `1312762915247626`)
  - `FB_ACCESS_TOKEN` = your Page Access Token
- If you leave these blank, the app runs in **manual mode** perfectly fine

### 4. Done
- Render gives you a live URL like `https://astra-musica.onrender.com`
- Visit it, click **Public** to see leaderboards
- Click **Judge**, use password `judge1` to test English division scoring
- Click **Admin** to manage submissions and reveal results

## Judge Demo Passwords

| Password | Judge | Division |
|----------|-------|----------|
| judge1 | Sarah M. | English |
| judge2 | Pieter K. | Afrikaans |
| judge3 | Rebecca L. | Gospel |
| judge4 | David N. | Praise & Worship |

## Adding Your Logo

In `public/index.html`, find:
```html
<div class="logo-box">AM</div>
```
Replace with:
```html
<img src="YOUR_LOGO_URL" alt="Astra Musica" style="width:44px;height:44px;object-fit:contain;">
```

Upload your logo to Firebase Storage or any image host, paste the URL.

## Next Steps (After Deploy)

1. **Test judging flow** — log in as each judge, score songs, verify blind judging works
2. **Test public results** — go to Public → Final Results, see countdown
3. **Test admin reveal** — Admin → Results Control → Reveal Results Now
4. **Add real submissions** — Admin panel → Add Submission Manually (paste from your Facebook Group)
5. **Connect Facebook later** — when you get a working Page Access Token, add it to Render environment variables

## Troubleshooting

**"Deploy failed" / Exit code 254**
→ Your GitHub repo is probably empty or files are in a subfolder. Check that `server.js` and `package.json` are visible at the top level of your repo.

**"Cannot find module 'express'"**
→ Build command is wrong. Make sure it's `npm install` and language is set to Node.

**Blank page after deploy**
→ Check that the `public/` folder was uploaded with `index.html`, `app.js`, and `style.css` inside it.
