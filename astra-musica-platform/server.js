const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== CONFIGURATION =====
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_POLL_INTERVAL = process.env.FB_POLL_INTERVAL || '*/10 * * * *'; // Every 10 minutes

// In-memory store (replace with Firebase in production)
let submissions = [];
let scores = {};
let memberWeekLimits = {};
let currentWeekId = getWeekId();
let resultsRevealed = false;

// ===== DIVISION CONFIG =====
const divisions = {
  english: { name: 'English', color: '#C41E3A', hasChallenge: true },
  afrikaans: { name: 'Afrikaans', color: '#228B22', hasChallenge: true },
  gospel: { name: 'Gospel', color: '#8B4513', hasChallenge: false },
  praiseandworship: { name: 'Praise & Worship', color: '#800080', hasChallenge: false }
};

const judges = {
  judge1: { name: 'Sarah M.', division: 'english', password: 'judge1' },
  judge2: { name: 'Pieter K.', division: 'afrikaans', password: 'judge2' },
  judge3: { name: 'Rebecca L.', division: 'gospel', password: 'judge3' },
  judge4: { name: 'David N.', division: 'praiseandworship', password: 'judge4' }
};

// ===== UTILITIES =====
function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday-based week
  return d.toISOString().split('T')[0];
}

function parseHashtags(message) {
  if (!message) return [];
  const matches = message.match(/#\w+/g);
  return matches ? matches.map(tag => tag.toLowerCase().replace('#', '')) : [];
}

function extractLink(attachments) {
  if (!attachments || !attachments.data) return null;
  for (const att of attachments.data) {
    if (att.type === 'share' && att.url) return att.url;
    if (att.type === 'link' && att.url) return att.url;
  }
  return null;
}

function isChallengePost(tags) {
  return tags.includes('challenge') || tags.includes('weeklychallenge');
}

function getChallengeDivision(tags) {
  if (tags.includes('english') && divisions.english.hasChallenge) return 'english';
  if (tags.includes('afrikaans') && divisions.afrikaans.hasChallenge) return 'afrikaans';
  return null;
}

function canAcceptEntry(author, entryType, challengeDiv) {
  const week = currentWeekId;
  const key = `${author}_${week}`;

  if (!memberWeekLimits[key]) {
    memberWeekLimits[key] = { top20: 0, challenge: 0 };
  }

  const limits = memberWeekLimits[key];

  if (entryType === 'challenge') {
    if (limits.challenge >= 1) {
      return { accepted: false, reason: 'Challenge limit reached (1 per week)' };
    }
    if (!challengeDiv) {
      return { accepted: false, reason: 'Challenges only for English & Afrikaans' };
    }
    limits.challenge++;
    return { accepted: true };
  }

  // Top 20 entry
  if (limits.top20 >= 2) {
    return { accepted: false, reason: 'Top 20 limit reached (2 per week)' };
  }
  limits.top20++;
  return { accepted: true };
}

// ===== FACEBOOK POLLING =====
async function pollFacebook() {
  if (!FB_PAGE_ID || !FB_ACCESS_TOKEN) {
    console.log('Facebook credentials not configured. Skipping poll.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts`;
    const response = await axios.get(url, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'id,message,from,attachments,created_time',
        limit: 20
      }
    });

    const posts = response.data.data || [];

    for (const post of posts) {
      // Skip if already processed
      if (submissions.find(s => s.facebookPostId === post.id)) continue;

      const tags = parseHashtags(post.message);
      const link = extractLink(post.attachments);
      const author = post.from ? post.from.name : 'Unknown';
      const authorId = post.from ? post.from.id : 'unknown';

      // Must have at least one division tag
      const divTags = tags.filter(t => divisions[t]);
      if (divTags.length === 0) continue;

      const isChallenge = isChallengePost(tags);
      const challengeDiv = isChallenge ? getChallengeDivision(tags) : null;
      const entryType = isChallenge ? 'challenge' : 'top20';

      // Check entry limits
      const check = canAcceptEntry(authorId, entryType, challengeDiv);
      if (!check.accepted) {
        console.log(`Rejected entry from ${author}: ${check.reason}`);
        continue;
      }

      const submission = {
        id: submissions.length + 1,
        facebookPostId: post.id,
        weekId: currentWeekId,
        author: author,
        title: post.message ? post.message.split('\n')[0].substring(0, 60) : 'Untitled',
        message: post.message || '',
        tags: divTags,
        entryType: entryType,
        challengeDivision: challengeDiv,
        link: link || `https://facebook.com/${post.id}`,
        createdAt: post.created_time,
        timestamp: new Date().toISOString()
      };

      submissions.push(submission);
      console.log(`Added submission: ${submission.title} (${entryType})`);
    }

    console.log(`Poll complete. Total submissions: ${submissions.length}`);
  } catch (error) {
    console.error('Facebook polling error:', error.response?.data?.error?.message || error.message);
  }
}

// Schedule Facebook polling
cron.schedule(FB_POLL_INTERVAL, pollFacebook);
console.log(`Facebook polling scheduled: ${FB_POLL_INTERVAL}`);

// Manual poll endpoint (for testing)
app.post('/api/poll-facebook', async (req, res) => {
  await pollFacebook();
  res.json({ success: true, submissionCount: submissions.length });
});

// ===== API ENDPOINTS =====

// Judge login
app.post('/api/judge/login', (req, res) => {
  const { password } = req.body;
  const judge = Object.values(judges).find(j => j.password === password);
  if (!judge) return res.status(401).json({ error: 'Invalid password' });
  res.json({ success: true, judge: { name: judge.name, division: judge.division } });
});

// Get submissions for judge's division
app.get('/api/judge/submissions', (req, res) => {
  const { division } = req.query;
  const divSubs = submissions.filter(s => 
    s.tags.includes(division) && 
    s.entryType === 'top20' &&
    s.weekId === currentWeekId
  );
  res.json(divSubs);
});

// Submit score
app.post('/api/judge/score', (req, res) => {
  const { submissionId, judgeName, criteria } = req.body;
  const total = Math.round((criteria.reduce((a, b) => a + b, 0) / 40) * 100);

  if (!scores[submissionId]) scores[submissionId] = {};
  scores[submissionId][judgeName] = { criteria, total };

  res.json({ success: true, total });
});

// Get scores for admin (all visible)
app.get('/api/admin/scores', (req, res) => {
  res.json(scores);
});

// Get all submissions (admin)
app.get('/api/admin/submissions', (req, res) => {
  res.json(submissions);
});

// Get member limits (admin)
app.get('/api/admin/limits', (req, res) => {
  res.json(memberWeekLimits);
});

// Get public Top 20
app.get('/api/public/top20', (req, res) => {
  const { division } = req.query;
  const divSubs = submissions
    .filter(s => s.tags.includes(division) && s.entryType === 'top20' && s.weekId === currentWeekId)
    .map(s => {
      const subScores = scores[s.id] || {};
      const allPcts = Object.values(subScores).map(sc => sc.total);
      const avg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;
      return { ...s, avg };
    })
    .sort((a, b) => (b.avg || 0) - (a.avg || 0))
    .slice(0, 20);
  res.json(divSubs);
});

// Get public challenges
app.get('/api/public/challenges', (req, res) => {
  const { division } = req.query;
  const seen = new Set();
  const chals = submissions
    .filter(s => {
      if (s.entryType !== 'challenge') return false;
      if (s.challengeDivision !== division) return false;
      if (s.weekId !== currentWeekId) return false;
      const key = s.author + '-' + division;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(s => {
      const subScores = scores[s.id] || {};
      const allPcts = Object.values(subScores).map(sc => sc.total);
      const avg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;
      return { ...s, avg };
    })
    .sort((a, b) => (b.avg || 0) - (a.avg || 0));
  res.json(chals);
});

// Get results (only if revealed)
app.get('/api/public/results', (req, res) => {
  if (!resultsRevealed) {
    return res.status(403).json({ error: 'Results not yet revealed' });
  }
  const { division } = req.query;
  const ranked = submissions
    .filter(s => s.tags.includes(division) && s.entryType === 'top20' && s.weekId === currentWeekId)
    .map(s => {
      const subScores = scores[s.id] || {};
      const allPcts = Object.values(subScores).map(sc => sc.total);
      const avg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : 0;
      return { ...s, avg };
    })
    .sort((a, b) => b.avg - a.avg);
  res.json(ranked);
});

// Admin: reveal/hide results
app.post('/api/admin/reveal', (req, res) => {
  resultsRevealed = true;
  res.json({ revealed: true });
});

app.post('/api/admin/hide', (req, res) => {
  resultsRevealed = false;
  res.json({ revealed: false });
});

// Admin: get reveal status
app.get('/api/admin/reveal-status', (req, res) => {
  res.json({ revealed: resultsRevealed });
});

// Get divisions config
app.get('/api/divisions', (req, res) => {
  res.json(divisions);
});

// Get current week
app.get('/api/week', (req, res) => {
  res.json({ weekId: currentWeekId });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', weekId: currentWeekId, submissions: submissions.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`Astra Musica server running on port ${PORT}`);
  console.log(`Current week: ${currentWeekId}`);

  // Initial poll
  if (FB_PAGE_ID && FB_ACCESS_TOKEN) {
    pollFacebook();
  }
});
