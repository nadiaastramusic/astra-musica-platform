const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================== CONFIG =====================
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || '';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ===================== BRAND COLOURS =====================
const divisions = {
  english: { name: 'English', color: '#C41E3A', bg: 'rgba(196,30,58,0.08)' },
  afrikaans: { name: 'Afrikaans', color: '#228B22', bg: 'rgba(34,139,34,0.08)' },
  gospel: { name: 'Gospel', color: '#8B4513', bg: 'rgba(139,69,19,0.08)' },
  praiseandworship: { name: 'Praise & Worship', color: '#800080', bg: 'rgba(128,0,128,0.08)' }
};

const judges = {
  judge1: { name: 'Sarah M.', division: 'english', password: 'judge1' },
  judge2: { name: 'Pieter K.', division: 'afrikaans', password: 'judge2' },
  judge3: { name: 'Rebecca L.', division: 'gospel', password: 'judge3' },
  judge4: { name: 'David N.', division: 'praiseandworship', password: 'judge4' }
};

// ===================== DATA STORE =====================
let submissions = [
  { id: 1, author: 'John D.', title: 'Broken Chains', tags: ['english','gospel'], link: 'https://suno.ai/song/abc1', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-10T14:00' },
  { id: 2, author: 'Maria S.', title: 'Grace Unfolding', tags: ['english','praiseandworship'], link: 'https://suno.ai/song/abc2', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-10T15:30' },
  { id: 3, author: 'Andre V.', title: 'Boeretroos', tags: ['afrikaans'], link: 'https://suno.ai/song/abc3', entryType: 'challenge', challengeDivision: 'afrikaans', timestamp: '2026-08-11T09:00' },
  { id: 4, author: 'Lindiwe N.', title: 'Siyabonga', tags: ['afrikaans','gospel'], link: 'https://suno.ai/song/abc4', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-11T10:15' },
  { id: 5, author: 'Thabo M.', title: 'Amazing Grace Remix', tags: ['gospel','english'], link: 'https://suno.ai/song/abc5', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-11T11:00' },
  { id: 6, author: 'Sarah J.', title: 'Morning Worship', tags: ['praiseandworship','english'], link: 'https://suno.ai/song/abc6', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-11T12:30' },
  { id: 7, author: 'John D.', title: 'Second Try', tags: ['english'], link: 'https://suno.ai/song/abc7', entryType: 'challenge', challengeDivision: 'english', timestamp: '2026-08-11T13:00' },
  { id: 8, author: 'Emma W.', title: "Heaven's Door", tags: ['gospel'], link: 'https://suno.ai/song/abc8', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-11T14:00' },
  { id: 9, author: 'Pieter D.', title: 'Afrikaanse Lied', tags: ['afrikaans','praiseandworship'], link: 'https://suno.ai/song/abc9', entryType: 'challenge', challengeDivision: 'afrikaans', timestamp: '2026-08-11T15:00' },
  { id: 10, author: 'Grace T.', title: 'Hallelujah Chorus', tags: ['praiseandworship','gospel'], link: 'https://suno.ai/song/abc10', entryType: 'top20', challengeDivision: null, timestamp: '2026-08-11T16:00' }
];

let scores = {}; // { submissionId: { judgeName: { criteria: [v,p,o,i], total: 0-100 } } }
let resultsRevealed = false;
let revealTime = new Date('2026-08-14T20:00:00').getTime();
let nextId = 11;

// ===================== HELPERS =====================
function calculatePercentage(criteria) {
  const sum = criteria.reduce((a, b) => a + (parseFloat(b) || 0), 0);
  return Math.round((sum / 40) * 100);
}

function getAverageScore(submissionId) {
  const subScores = scores[submissionId];
  if (!subScores) return null;
  const allPcts = Object.values(subScores).map(s => s.total);
  if (allPcts.length === 0) return null;
  return Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length);
}

function getRankings() {
  return submissions
    .map(s => ({ ...s, avg: getAverageScore(s.id) }))
    .filter(s => s.avg !== null)
    .sort((a, b) => b.avg - a.avg);
}

function getChallengeSubs() {
  const seen = new Set();
  return submissions.filter(s => {
    if (s.entryType !== 'challenge') return false;
    const key = s.author + '-' + s.challengeDivision;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===================== API ROUTES =====================

// Get all submissions
app.get('/api/submissions', (req, res) => {
  res.json(submissions);
});

// Add submission manually (admin)
app.post('/api/submissions', (req, res) => {
  const { author, title, tags, link, entryType, challengeDivision } = req.body;
  if (!author || !title || !tags || !link) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const sub = {
    id: nextId++,
    author,
    title,
    tags,
    link,
    entryType: entryType || 'top20',
    challengeDivision: challengeDivision || null,
    timestamp: new Date().toISOString()
  };
  submissions.push(sub);
  res.json(sub);
});

// Get judges
app.get('/api/judges', (req, res) => {
  // Don't send passwords to frontend
  const safe = {};
  for (const [k, v] of Object.entries(judges)) {
    safe[k] = { name: v.name, division: v.division };
  }
  res.json(safe);
});

// Judge login
app.post('/api/judges/login', (req, res) => {
  const { password } = req.body;
  const judge = Object.values(judges).find(j => j.password === password);
  if (!judge) return res.status(401).json({ error: 'Invalid password' });
  res.json({ name: judge.name, division: judge.division });
});

// Save score
app.post('/api/scores', (req, res) => {
  const { submissionId, judgeName, criteria } = req.body;
  if (!submissionId || !judgeName || !criteria) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const total = calculatePercentage(criteria);
  if (!scores[submissionId]) scores[submissionId] = {};
  scores[submissionId][judgeName] = { criteria, total };
  res.json({ success: true, total });
});

// Get scores (admin only in real app; simplified here)
app.get('/api/scores', (req, res) => {
  res.json(scores);
});

// Admin: reveal/hide results
app.post('/api/admin/reveal', (req, res) => {
  const { revealed } = req.body;
  resultsRevealed = revealed;
  res.json({ revealed: resultsRevealed });
});

// Admin: set reveal time
app.post('/api/admin/reveal-time', (req, res) => {
  const { time } = req.body;
  revealTime = new Date(time).getTime();
  res.json({ revealTime });
});

// Get status
app.get('/api/status', (req, res) => {
  res.json({ resultsRevealed, revealTime });
});

// Get rankings
app.get('/api/rankings', (req, res) => {
  res.json(getRankings());
});

// ===================== FACEBOOK POLLING =====================
async function pollFacebook() {
  if (!FB_PAGE_ID || !FB_ACCESS_TOKEN) {
    console.log('[FB] Skipping poll — no credentials configured');
    return;
  }
  try {
    const url = `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts?access_token=${FB_ACCESS_TOKEN}&fields=message,permalink_url,created_time`;
    const response = await axios.get(url);
    const posts = response.data.data || [];
    console.log(`[FB] Polled ${posts.length} posts`);
    // TODO: Parse hashtags and auto-add submissions
  } catch (err) {
    console.error('[FB] Poll error:', err.response?.data?.error?.message || err.message);
  }
}

// Poll on startup and every 10 min
pollFacebook();
setInterval(pollFacebook, POLL_INTERVAL_MS);

// ===================== START =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Astra Musica server running on port ${PORT}`);
  console.log(`Facebook polling: ${FB_PAGE_ID && FB_ACCESS_TOKEN ? 'ENABLED' : 'DISABLED (manual mode)'}`);
});
