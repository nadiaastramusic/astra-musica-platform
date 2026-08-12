// ===================== CONFIG =====================
const API = '';
const divisions = {
  english: { name: 'English', color: '#C41E3A' },
  afrikaans: { name: 'Afrikaans', color: '#228B22' },
  gospel: { name: 'Gospel', color: '#8B4513' },
  praiseandworship: { name: 'Praise & Worship', color: '#800080' }
};

// ===================== STATE =====================
let currentRole = null;
let currentJudge = null;
let submissions = [];
let scores = {};
let resultsRevealed = false;
let revealTime = new Date('2026-08-14T20:00:00').getTime();
let publicFilter = 'all';
let adminFilter = 'all';

// ===================== UTILS =====================
function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  show(id);
}
function toast(msg, type='success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function getAverageScore(subId) {
  const subScores = scores[subId];
  if (!subScores) return null;
  const all = Object.values(subScores).map(s => s.total);
  return Math.round(all.reduce((a,b) => a+b, 0) / all.length);
}

function getRankings() {
  return submissions
    .map(s => ({ ...s, avg: getAverageScore(s.id) }))
    .filter(s => s.avg !== null)
    .sort((a,b) => b.avg - a.avg);
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

function getSubsForDivision(div) {
  return submissions.filter(s => s.tags.includes(div) && s.entryType === 'top20');
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

// ===================== API =====================
async function apiGet(path) {
  const r = await fetch(API + path);
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(API + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function loadData() {
  submissions = await apiGet('/api/submissions');
  scores = await apiGet('/api/scores');
  const status = await apiGet('/api/status');
  resultsRevealed = status.resultsRevealed;
  revealTime = status.revealTime;
}

// ===================== NAVIGATION =====================
function selectRole(role) {
  currentRole = role;
  if (role === 'admin') {
    $('headerBadge').innerHTML = '<span class="badge">Admin</span>';
    showScreen('screenAdmin');
    setAdminTab('submissions');
  } else if (role === 'judge') {
    $('headerBadge').innerHTML = '';
    showScreen('screenJudgeLogin');
    $('judgePassword').value = '';
    setTimeout(() => $('judgePassword').focus(), 100);
  } else {
    $('headerBadge').innerHTML = '<span class="badge">Public</span>';
    showScreen('screenPublic');
    setPublicTab('top20');
  }
}

function goBack() {
  currentRole = null; currentJudge = null;
  $('headerBadge').innerHTML = '';
  showScreen('screenRole');
}

// ===================== JUDGE =====================
async function loginJudge() {
  const pw = $('judgePassword').value.trim().toLowerCase();
  try {
    const res = await apiPost('/api/judges/login', { password: pw });
    if (res.error) throw new Error(res.error);
    currentJudge = res;
    $('headerBadge').innerHTML = `<span class="badge">Judge · ${divisions[currentJudge.division].name}</span>`;
    $('judgeDivisionName').textContent = divisions[currentJudge.division].name;
    showScreen('screenJudge');
    renderJudgePanel();
  } catch (e) {
    $('loginError').style.display = 'block';
  }
}

function renderJudgePanel() {
  const container = $('judgeSubmissions');
  const divSubs = getSubsForDivision(currentJudge.division);

  if (divSubs.length === 0) {
    container.innerHTML = '<p class="text-center text-tertiary" style="padding:40px;">No submissions yet for this division.</p>';
    return;
  }

  container.innerHTML = divSubs.map(sub => {
    const myScore = scores[sub.id]?.[currentJudge.name];
    const isScored = !!myScore;
    const c = myScore ? myScore.criteria : [0,0,0,0];
    const divColor = divisions[currentJudge.division].color;
    return `
      <div class="card" style="border-left: 4px solid ${divColor};">
        <div class="card-header">
          <div>
            <div class="card-title">${sub.title}</div>
            <div class="card-meta">by ${sub.author} · ${formatDate(sub.timestamp)}</div>
          </div>
          ${isScored ? '<span style="font-size:12px;color:var(--afrikaans-green);font-weight:700;">✓ Scored</span>' : ''}
        </div>
        <div class="tags">
          ${sub.tags.map(t => `<span class="tag ${t}">#${t}</span>`).join('')}
          ${sub.entryType === 'challenge' ? '<span class="challenge-badge">Challenge</span>' : ''}
        </div>
        <a href="${sub.link}" target="_blank" class="link-btn">🔗 Open song link</a>
        <div class="criteria-grid">
          <div class="criterion"><label>Vocals</label><input type="number" min="0" max="10" value="${c[0]}" id="c1-${sub.id}" onchange="updateScore(${sub.id})"></div>
          <div class="criterion"><label>Production</label><input type="number" min="0" max="10" value="${c[1]}" id="c2-${sub.id}" onchange="updateScore(${sub.id})"></div>
          <div class="criterion"><label>Originality</label><input type="number" min="0" max="10" value="${c[2]}" id="c3-${sub.id}" onchange="updateScore(${sub.id})"></div>
          <div class="criterion"><label>Impact</label><input type="number" min="0" max="10" value="${c[3]}" id="c4-${sub.id}" onchange="updateScore(${sub.id})"></div>
        </div>
        <div class="score-display">
          <span class="label">Total Score</span>
          <span class="value" id="total-${sub.id}">${isScored ? myScore.total + '%' : '—'}</span>
        </div>
        ${isScored ? '<p style="font-size:12px;color:var(--afrikaans-green);margin-top:8px;">✓ Your score is saved and hidden from other judges.</p>' : ''}
      </div>
    `;
  }).join('');
}

async function updateScore(subId) {
  const c1 = parseFloat($(`c1-${subId}`).value) || 0;
  const c2 = parseFloat($(`c2-${subId}`).value) || 0;
  const c3 = parseFloat($(`c3-${subId}`).value) || 0;
  const c4 = parseFloat($(`c4-${subId}`).value) || 0;
  const total = Math.round(((c1+c2+c3+c4)/40)*100);

  await apiPost('/api/scores', {
    submissionId: subId,
    judgeName: currentJudge.name,
    criteria: [c1,c2,c3,c4]
  });

  scores = await apiGet('/api/scores');
  renderJudgePanel();
  toast('Score saved!');
}

// ===================== PUBLIC =====================
function setPublicTab(tab) {
  document.querySelectorAll('#screenPublic .tab').forEach(t => t.classList.remove('active'));
  $('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

  hide('publicTop20'); hide('publicChallenges'); hide('publicResults');
  show('public' + (tab === 'top20' ? 'Top20' : tab === 'challenges' ? 'Challenges' : 'Results'));

  if (tab === 'top20') renderTop20();
  if (tab === 'challenges') renderChallenges();
  if (tab === 'results') renderResults();
}

function filterPublic(tag) {
  publicFilter = tag;
  document.querySelectorAll('#top20Filters .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderTop20();
}

function renderTop20() {
  const list = $('top20List');
  const divs = ['english','afrikaans','gospel','praiseandworship'];

  let html = '';
  divs.forEach(div => {
    if (publicFilter !== 'all' && publicFilter !== div) return;
    const divSubs = getSubsForDivision(div).map(s => ({...s, avg: getAverageScore(s.id)}))
      .sort((a,b) => (b.avg||0) - (a.avg||0)).slice(0, 20);
    if (divSubs.length === 0) return;

    html += `<h3 style="color:${divisions[div].color};margin:20px 0 10px;font-size:16px;font-weight:700;">${divisions[div].name} Top 20</h3>`;
    html += divSubs.map((sub, idx) => `
      <div class="submission-row">
        <div class="submission-info">
          <div class="rank-num ${idx < 3 ? 'top3' : ''}">${idx + 1}</div>
          <div>
            <div style="font-weight:600;font-size:15px;">${sub.title}</div>
            <div style="font-size:12px;color:var(--text-tertiary);">by ${sub.author}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:16px;">${sub.avg ? sub.avg + '%' : 'Pending'}</div>
          <div class="tags" style="justify-content:flex-end;margin-top:4px;">
            ${sub.tags.map(t => `<span class="tag ${t}" style="font-size:11px;padding:2px 8px;">#${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  });

  list.innerHTML = html || '<p class="text-center text-tertiary" style="padding:40px;">No submissions yet.</p>';
}

function renderChallenges() {
  const list = $('challengesList');
  const chals = getChallengeSubs();
  const divs = ['english','afrikaans'];

  let html = '';
  divs.forEach(div => {
    const divChals = chals.filter(c => c.challengeDivision === div);
    if (divChals.length === 0) return;

    html += `<h3 style="color:${divisions[div].color};margin:20px 0 10px;font-size:16px;font-weight:700;">${divisions[div].name} Challenge</h3>`;
    html += divChals.map(sub => `
      <div class="card" style="border-left:4px solid ${divisions[div].color};">
        <div class="card-header">
          <div>
            <div class="card-title">${sub.title}</div>
            <div class="card-meta">by ${sub.author} · ${formatDate(sub.timestamp)}</div>
          </div>
          <span class="challenge-badge">Challenge</span>
        </div>
        <div class="tags">${sub.tags.map(t => `<span class="tag ${t}">#${t}</span>`).join('')}</div>
        <a href="${sub.link}" target="_blank" class="link-btn">🔗 Open song link</a>
      </div>
    `).join('');
  });

  list.innerHTML = html || '<p class="text-center text-tertiary" style="padding:40px;">No challenge entries yet.</p>';
}

function renderResults() {
  const countdownWrap = $('resultsCountdownWrap');
  const content = $('resultsContent');

  if (!resultsRevealed) {
    show('resultsCountdownWrap'); hide('resultsContent');
    updateCountdown();
  } else {
    hide('resultsCountdownWrap'); show('resultsContent');
    const rankings = getRankings();
    if (rankings.length === 0) {
      $('resultsList').innerHTML = '<p class="text-center text-tertiary" style="padding:40px;">No scores submitted yet.</p>';
      return;
    }
    $('podium1Name').textContent = rankings[0]?.title || '—';
    $('podium1Score').textContent = rankings[0]?.avg + '%' || '—';
    $('podium2Name').textContent = rankings[1]?.title || '—';
    $('podium2Score').textContent = rankings[1]?.avg + '%' || '—';
    $('podium3Name').textContent = rankings[2]?.title || '—';
    $('podium3Score').textContent = rankings[2]?.avg + '%' || '—';

    $('resultsList').innerHTML = rankings.slice(3).map((sub, idx) => `
      <div class="submission-row">
        <div class="submission-info">
          <div class="rank-num">${idx + 4}</div>
          <div>
            <div style="font-weight:600;font-size:15px;">${sub.title}</div>
            <div style="font-size:12px;color:var(--text-tertiary);">by ${sub.author}</div>
          </div>
        </div>
        <div style="font-weight:700;font-size:16px;">${sub.avg}%</div>
      </div>
    `).join('');
  }
}

function updateCountdown() {
  if (resultsRevealed) return;
  const diff = revealTime - Date.now();
  if (diff <= 0) {
    ['Days','Hours','Mins','Secs'].forEach(u => $(`cd${u}`).textContent = '00');
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  $('cdDays').textContent = String(d).padStart(2,'0');
  $('cdHours').textContent = String(h).padStart(2,'0');
  $('cdMins').textContent = String(m).padStart(2,'0');
  $('cdSecs').textContent = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000);

// ===================== ADMIN =====================
function setAdminTab(tab) {
  document.querySelectorAll('#screenAdmin .tab').forEach(t => t.classList.remove('active'));
  $('tabAdmin' + (tab==='submissions'?'Submissions':tab==='judges'?'Judges':'Results')).classList.add('active');
  hide('adminSubmissions'); hide('adminJudges'); hide('adminResults');
  show('admin' + (tab==='submissions'?'Submissions':tab==='judges'?'Judges':'Results'));
  if (tab === 'submissions') renderAdminSubmissions();
  if (tab === 'judges') renderAdminJudges();
  if (tab === 'results') renderAdminResults();
}

function filterAdmin(tag) {
  adminFilter = tag;
  document.querySelectorAll('#adminFilters .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderAdminSubmissions();
}

function renderAdminSubmissions() {
  const container = $('adminSubmissionList');
  let subs = submissions;
  if (adminFilter !== 'all') subs = subs.filter(s => s.tags.includes(adminFilter));

  container.innerHTML = subs.map(sub => {
    const subScores = scores[sub.id] || {};
    const judgeCount = Object.keys(subScores).length;
    const avg = getAverageScore(sub.id);
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${sub.title}</div>
            <div class="card-meta">by ${sub.author} · ${sub.tags.map(t => '#' + t).join(' ')}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:var(--text-secondary);">${judgeCount} judge${judgeCount!==1?'s':''} scored</div>
            <div style="font-size:22px;font-weight:700;color:var(--brand-blue);">${avg ? avg + '%' : '—'}</div>
          </div>
        </div>
        ${sub.entryType === 'challenge' ? '<span class="challenge-badge">Challenge</span>' : ''}
        <div style="margin-top:10px;font-size:12px;color:var(--text-tertiary);">
          ${Object.entries(subScores).map(([judge, data]) => `${judge}: ${data.total}%`).join(' · ') || 'No scores yet'}
        </div>
      </div>
    `;
  }).join('');
}

function renderAdminJudges() {
  const tbody = $('judgesTable');
  const judgesData = { judge1: { name: 'Sarah M.', division: 'english' }, judge2: { name: 'Pieter K.', division: 'afrikaans' }, judge3: { name: 'Rebecca L.', division: 'gospel' }, judge4: { name: 'David N.', division: 'praiseandworship' } };

  tbody.innerHTML = Object.entries(judgesData).map(([id, j]) => {
    const scoreCount = Object.values(scores).filter(s => s[j.name]).length;
    const totalSubs = getSubsForDivision(j.division).length;
    return `
      <tr>
        <td style="font-weight:600;">${j.name}</td>
        <td><span class="tag ${j.division}" style="font-size:11px;">${divisions[j.division].name}</span></td>
        <td><span class="status-dot active"></span>Active</td>
        <td>${scoreCount} / ${totalSubs}</td>
      </tr>
    `;
  }).join('');
}

function renderAdminResults() {
  const rankings = getRankings();
  $('adminScoreSummary').innerHTML = `
    <div style="font-size:14px;margin-bottom:8px;"><span class="text-secondary">Total scored:</span> <b>${rankings.length} / ${submissions.length}</b></div>
    <div style="font-size:14px;margin-bottom:8px;"><span class="text-secondary">Current leader:</span> <b>${rankings[0]?.title || 'None'}</b> ${rankings[0]?.avg ? '(' + rankings[0].avg + '%)' : ''}</div>
    <div style="font-size:14px;"><span class="text-secondary">Results status:</span> <b style="color:${resultsRevealed ? 'var(--afrikaans-green)' : 'var(--brand-gold)'}">${resultsRevealed ? 'REVEALED' : 'HIDDEN'}</b></div>
  `;
}

async function revealResults() {
  await apiPost('/api/admin/reveal', { revealed: true });
  resultsRevealed = true;
  toast('Results revealed to public!');
  renderAdminResults();
}

async function hideResults() {
  await apiPost('/api/admin/reveal', { revealed: false });
  resultsRevealed = false;
  toast('Results hidden.');
  renderAdminResults();
}

async function addManualSubmission() {
  const author = $('mAuthor').value.trim();
  const title = $('mTitle').value.trim();
  const link = $('mLink').value.trim();
  const tagsRaw = $('mTags').value.trim();
  const entryType = $('mType').value;
  const challengeDivision = $('mChallengeDiv').value;

  if (!author || !title || !link || !tagsRaw) {
    toast('Please fill all required fields', 'error'); return;
  }

  const tags = tagsRaw.split(/[\s,]+/).map(t => t.replace('#','').toLowerCase()).filter(Boolean);
  const payload = { author, title, link, tags, entryType };
  if (entryType === 'challenge') payload.challengeDivision = challengeDivision;

  await apiPost('/api/submissions', payload);
  await loadData();
  renderAdminSubmissions();
  toast('Submission added!');

  // Clear form
  $('mAuthor').value = ''; $('mTitle').value = ''; $('mLink').value = '';
  $('mTags').value = '';
}

// ===================== INIT =====================
async function init() {
  await loadData();
  showScreen('screenRole');
  updateCountdown();
}
init();
