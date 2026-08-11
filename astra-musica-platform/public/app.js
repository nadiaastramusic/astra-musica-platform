// ===== CONFIG =====
const API_BASE = ''; // Same origin
const divColors = {
  english: { primary: '#C41E3A', name: 'English' },
  afrikaans: { primary: '#228B22', name: 'Afrikaans' },
  gospel: { primary: '#8B4513', name: 'Gospel' },
  praiseandworship: { primary: '#800080', name: 'Praise & Worship' }
};

// ===== STATE =====
let currentJudge = null;
let currentDivision = 'english';
let currentChallenge = 'english';
let currentResults = 'english';
let currentChallengeResults = 'english';
let adminFilter = 'all';
let revealTime = new Date('2026-08-14T20:00:00').getTime();
let resultsRevealed = false;

// ===== UTILITIES =====
function showScreen(id) {
  document.querySelectorAll('[id^="screen"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

async function api(endpoint, options = {}) {
  const res = await fetch(API_BASE + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return res.json();
}

// ===== NAVIGATION =====
function selectRole(role) {
  if (role === 'admin') {
    document.getElementById('headerRight').innerHTML = '<span style="font-size:12px;padding:4px 10px;border-radius:6px;background:rgba(65,105,225,0.12);color:#4169E1;font-weight:500;">Admin</span>';
    showScreen('screenAdmin');
    renderAdminJudges();
    renderAdminSubmissions();
    renderAdminLimits();
    renderAdminSummary();
  } else if (role === 'judge') {
    document.getElementById('headerRight').innerHTML = '';
    showScreen('screenJudgeLogin');
    document.getElementById('judgePassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
    setTimeout(() => document.getElementById('judgePassword').focus(), 100);
  } else {
    document.getElementById('headerRight').innerHTML = '<span style="font-size:12px;padding:4px 10px;border-radius:6px;background:rgba(65,105,225,0.12);color:#4169E1;font-weight:500;">Public</span>';
    showScreen('screenPublic');
    setPublicTab('top20');
  }
}

function goBack() {
  document.getElementById('headerRight').innerHTML = '';
  showScreen('screenRole');
}

function logout() {
  currentJudge = null;
  goBack();
}

function changeWeek() {
  const week = document.getElementById('weekSelect').value;
  const status = document.getElementById('weekStatus');
  if (week === 'current') {
    status.textContent = 'Judging open';
    status.className = 'status-badge open';
  } else {
    status.textContent = 'Completed';
    status.className = 'status-badge closed';
  }
  showToast('Switched week');
}

// ===== JUDGE =====
async function loginJudge() {
  const pw = document.getElementById('judgePassword').value.trim().toLowerCase();
  const data = await api('/api/judge/login', { method: 'POST', body: { password: pw } });

  if (!data.success) {
    document.getElementById('loginError').classList.remove('hidden');
    return;
  }

  currentJudge = data.judge;
  const col = divColors[currentJudge.division].primary;
  document.getElementById('headerRight').innerHTML = `<span style="font-size:12px;padding:4px 10px;border-radius:6px;background:${col}15;color:${col};font-weight:500;">Judge · ${divColors[currentJudge.division].name}</span>`;
  document.getElementById('judgeDivisionName').textContent = divColors[currentJudge.division].name;
  document.getElementById('judgeDivisionName').style.color = col;
  showScreen('screenJudge');
  renderJudgePanel();
}

async function renderJudgePanel() {
  const container = document.getElementById('judgeSubmissions');
  const data = await api(`/api/judge/submissions?division=${currentJudge.division}`);
  const subs = data;
  const col = divColors[currentJudge.division].primary;

  if (!subs.length) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">No submissions yet for this division.</p>';
    return;
  }

  container.innerHTML = subs.map(sub => `
    <div class="card" style="border-left: 4px solid ${col};">
      <div class="card-header">
        <div>
          <div class="card-title">${sub.title}</div>
          <div class="card-meta">by ${sub.author} · ${new Date(sub.timestamp).toLocaleDateString()}</div>
        </div>
      </div>
      <div class="tags">
        ${sub.tags.map(t => `<span class="tag tag-${t === 'praiseandworship' ? 'pw' : t}">#${t}</span>`).join('')}
        ${sub.entryType === 'challenge' ? '<span class="challenge-badge">Challenge</span>' : ''}
      </div>
      <a href="${sub.link}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#666;margin-top:8px;text-decoration:none;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6477 14.9923C14.3638 15.0435 15.0841 14.9404 15.7655 14.6898C16.4468 14.4392 17.074 14.0468 17.6066 13.5359L21.6066 9.53589C22.5608 8.58167 23.0858 7.27368 23.0858 5.90989C23.0858 4.5461 22.5608 3.23811 21.6066 2.28389C20.6524 1.32967 19.3444 0.804688 17.9806 0.804688C16.6168 0.804688 15.3088 1.32967 14.3546 2.28389L13.2933 3.34523C12.9028 3.73575 12.9028 4.36892 13.2933 4.75944C13.6838 5.14996 14.317 5.14996 14.7075 4.75944L15.7689 3.6981C16.3417 3.12533 17.1442 2.80469 17.9806 2.80469C18.817 2.80469 19.6195 3.12533 20.1923 3.6981C20.7651 4.27087 21.0858 5.07343 21.0858 5.90989C21.0858 6.74635 20.7651 7.54891 20.1923 8.12168L16.1923 12.1217C15.8234 12.4906 15.3833 12.7812 14.8987 12.9754C14.414 13.1696 13.8951 13.2634 13.3722 13.2512C12.8493 13.239 12.3347 13.121 11.8597 12.9042C11.3847 12.6874 10.9593 12.3764 10.6088 11.9898C10.2183 11.5993 9.5851 11.5993 9.19458 11.9898C8.80405 12.3803 8.80405 13.0135 9.19458 13.404L10 13Z"/><path d="M14 11C13.5705 10.4259 13.0226 9.95092 12.3934 9.60711C11.7643 9.2633 11.0685 9.0589 10.3523 9.00773C9.63616 8.95656 8.91591 9.05964 8.23455 9.31022C7.55318 9.5608 6.92598 9.95318 6.3934 10.4641L2.3934 14.4641C1.43918 15.4183 0.914185 16.7263 0.914185 18.0901C0.914185 19.4539 1.43918 20.7619 2.3934 21.7161C3.34762 22.6703 4.65561 23.1953 6.0194 23.1953C7.38319 23.1953 8.69118 22.6703 9.6454 21.7161L10.7067 20.6548C11.0972 20.2642 11.0972 19.6311 10.7067 19.2405C10.3162 18.85 9.68303 18.85 9.2925 19.2405L8.23116 20.3019C7.65839 20.8747 6.85583 21.1953 6.0194 21.1953C5.18296 21.1953 4.3804 20.8747 3.80763 20.3019C3.23486 19.7291 2.91418 18.9266 2.91418 18.0901C2.91418 17.2536 3.23486 16.4511 3.80763 15.8783L7.80763 11.8783C8.17655 11.5094 8.61672 11.2188 9.10135 11.0246C9.58599 10.8304 10.1049 10.7366 10.6278 10.7488C11.1507 10.761 11.6653 10.879 12.1403 11.0958C12.6153 11.3126 13.0407 11.6236 13.3912 12.0102C13.7817 12.4007 14.4149 12.4007 14.8054 12.0102C15.1959 11.6197 15.1959 10.9865 14.8054 10.596L14 11Z"/></svg> Open link
      </a>
      <div class="criteria-grid">
        <div class="criterion"><label>Vocals</label><input type="number" min="0" max="10" value="0" id="c1-${sub.id}" onchange="updateScore(${sub.id})"></div>
        <div class="criterion"><label>Production</label><input type="number" min="0" max="10" value="0" id="c2-${sub.id}" onchange="updateScore(${sub.id})"></div>
        <div class="criterion"><label>Originality</label><input type="number" min="0" max="10" value="0" id="c3-${sub.id}" onchange="updateScore(${sub.id})"></div>
        <div class="criterion"><label>Impact</label><input type="number" min="0" max="10" value="0" id="c4-${sub.id}" onchange="updateScore(${sub.id})"></div>
      </div>
      <div class="score-display"><span class="label">Total score</span> <span id="total-${sub.id}" style="color:${col};">—</span></div>
    </div>
  `).join('');
}

async function updateScore(subId) {
  const c1 = parseFloat(document.getElementById(`c1-${subId}`).value) || 0;
  const c2 = parseFloat(document.getElementById(`c2-${subId}`).value) || 0;
  const c3 = parseFloat(document.getElementById(`c3-${subId}`).value) || 0;
  const c4 = parseFloat(document.getElementById(`c4-${subId}`).value) || 0;
  const total = Math.round(((c1 + c2 + c3 + c4) / 40) * 100);

  await api('/api/judge/score', {
    method: 'POST',
    body: { submissionId: subId, judgeName: currentJudge.name, criteria: [c1, c2, c3, c4] }
  });

  document.getElementById(`total-${subId}`).textContent = total + '%';
  showToast('Score saved');
}

// ===== PUBLIC =====
function setPublicTab(tab) {
  document.querySelectorAll('.pub-tab').forEach(t => {
    t.classList.remove('active');
    t.style.color = '#999';
    t.style.borderBottomColor = 'transparent';
  });
  const active = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  active.classList.add('active');
  active.style.color = '#4169E1';
  active.style.borderBottomColor = '#4169E1';

  document.getElementById('publicTop20').classList.add('hidden');
  document.getElementById('publicChallenges').classList.add('hidden');
  document.getElementById('publicResults').classList.add('hidden');
  document.getElementById('public' + (tab === 'top20' ? 'Top20' : tab === 'challenges' ? 'Challenges' : 'Results')).classList.remove('hidden');

  if (tab === 'top20') renderTop20();
  if (tab === 'challenges') renderChallenges();
  if (tab === 'results') renderResults();
}

function filterTop20(div) {
  currentDivision = div;
  document.querySelectorAll('.t20btn').forEach(b => {
    const isActive = b.dataset.div === div;
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? divColors[div].primary : 'transparent';
    b.style.color = isActive ? '#fff' : divColors[div].primary;
    b.style.borderColor = divColors[div].primary;
  });
  renderTop20();
}

async function renderTop20() {
  const list = document.getElementById('top20List');
  const data = await api(`/api/public/top20?division=${currentDivision}`);

  if (!data.length) {
    list.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">No submissions yet.</p>';
    return;
  }

  list.innerHTML = data.map((sub, idx) => `
    <div class="submission-row">
      <div class="submission-info">
        <div class="rank-num ${idx < 3 ? 'top3' : ''}">${idx + 1}</div>
        <div>
          <div style="font-weight:600;font-size:14px;">${sub.title}</div>
          <div style="font-size:12px;color:#999;">by ${sub.author}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:600;font-variant-numeric:tabular-nums;">${sub.avg ? sub.avg + '%' : 'Pending'}</div>
        <div class="tags" style="justify-content:flex-end;margin-top:4px;">
          ${sub.tags.map(t => `<span class="tag tag-${t === 'praiseandworship' ? 'pw' : t}" style="font-size:11px;padding:2px 8px;">#${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function filterChallenge(div) {
  currentChallenge = div;
  document.querySelectorAll('.chbtn').forEach(b => {
    const isActive = b.dataset.ch === div;
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? divColors[div].primary : 'transparent';
    b.style.color = isActive ? '#fff' : divColors[div].primary;
    b.style.borderColor = divColors[div].primary;
  });
  renderChallenges();
}

async function renderChallenges() {
  const list = document.getElementById('challengesList');
  const data = await api(`/api/public/challenges?division=${currentChallenge}`);

  if (!data.length) {
    list.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">No challenge entries yet.</p>';
    return;
  }

  list.innerHTML = data.map(sub => `
    <div class="card" style="border-left: 4px solid ${divColors[currentChallenge].primary};">
      <div class="card-header">
        <div>
          <div class="card-title">${sub.title}</div>
          <div class="card-meta">by ${sub.author} · Challenge: ${divColors[currentChallenge].name}</div>
        </div>
        <span class="challenge-badge">Challenge</span>
      </div>
      <div class="tags">
        ${sub.tags.map(t => `<span class="tag tag-${t === 'praiseandworship' ? 'pw' : t}">#${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

async function renderResults() {
  const status = await api('/api/admin/reveal-status');
  resultsRevealed = status.revealed;

  const cw = document.getElementById('resultsCountdownWrap');
  const ct = document.getElementById('resultsContent');

  if (!resultsRevealed) {
    cw.classList.remove('hidden');
    ct.classList.add('hidden');
    updateCountdown();
  } else {
    cw.classList.add('hidden');
    ct.classList.remove('hidden');
    renderResultsContent();
    renderChallengeResults();
  }
}

function filterResults(div) {
  currentResults = div;
  document.querySelectorAll('.rbtn').forEach(b => {
    const isActive = b.dataset.r === div;
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? divColors[div].primary : 'transparent';
    b.style.color = isActive ? '#fff' : divColors[div].primary;
    b.style.borderColor = divColors[div].primary;
  });
  renderResultsContent();
}

async function renderResultsContent() {
  try {
    const data = await api(`/api/public/results?division=${currentResults}`);

    document.getElementById('podium1Name').textContent = data[0]?.title || '—';
    document.getElementById('podium1Score').textContent = data[0]?.avg ? data[0].avg + '%' : '—';
    document.getElementById('podium2Name').textContent = data[1]?.title || '—';
    document.getElementById('podium2Score').textContent = data[1]?.avg ? data[1].avg + '%' : '—';
    document.getElementById('podium3Name').textContent = data[2]?.title || '—';
    document.getElementById('podium3Score').textContent = data[2]?.avg ? data[2].avg + '%' : '—';

    document.getElementById('resultsList').innerHTML = data.slice(3).map((sub, idx) => `
      <div class="submission-row">
        <div class="submission-info">
          <div class="rank-num">${idx + 4}</div>
          <div>
            <div style="font-weight:600;font-size:14px;">${sub.title}</div>
            <div style="font-size:12px;color:#999;">by ${sub.author}</div>
          </div>
        </div>
        <div style="font-weight:600;font-variant-numeric:tabular-nums;">${sub.avg}%</div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No scores yet.</p>';
  }
}

function filterChallengeResults(div) {
  currentChallengeResults = div;
  document.querySelectorAll('.crbtn').forEach(b => {
    const isActive = b.dataset.cr === div;
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? divColors[div].primary : 'transparent';
    b.style.color = isActive ? '#fff' : divColors[div].primary;
    b.style.borderColor = divColors[div].primary;
  });
  renderChallengeResults();
}

async function renderChallengeResults() {
  try {
    const data = await api(`/api/public/challenges?division=${currentChallengeResults}`);
    const ranked = data.sort((a, b) => (b.avg || 0) - (a.avg || 0));

    document.getElementById('challengeResultsList').innerHTML = ranked.map((sub, idx) => `
      <div class="submission-row">
        <div class="submission-info">
          <div class="rank-num ${idx < 3 ? 'top3' : ''}">${idx + 1}</div>
          <div>
            <div style="font-weight:600;font-size:14px;">${sub.title}</div>
            <div style="font-size:12px;color:#999;">by ${sub.author}</div>
          </div>
        </div>
        <div style="font-weight:600;font-variant-numeric:tabular-nums;">${sub.avg ? sub.avg + '%' : 'Pending'}</div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('challengeResultsList').innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No challenge results yet.</p>';
  }
}

function updateCountdown() {
  if (resultsRevealed) return;
  const diff = revealTime - Date.now();
  if (diff <= 0) {
    ['cdDays', 'cdHours', 'cdMins', 'cdSecs'].forEach(id => document.getElementById(id).textContent = '00');
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cdDays').textContent = String(d).padStart(2, '0');
  document.getElementById('cdHours').textContent = String(h).padStart(2, '0');
  document.getElementById('cdMins').textContent = String(m).padStart(2, '0');
  document.getElementById('cdSecs').textContent = String(s).padStart(2, '0');
}
setInterval(updateCountdown, 1000);

// ===== ADMIN =====
function setAdminTab(tab) {
  document.querySelectorAll('.adm-tab').forEach(t => {
    t.classList.remove('active');
    t.style.color = '#999';
    t.style.borderBottomColor = 'transparent';
  });
  const active = document.getElementById('tabAdmin' + (tab === 'judges' ? 'Judges' : tab === 'submissions' ? 'Submissions' : tab === 'limits' ? 'Limits' : 'Results'));
  active.classList.add('active');
  active.style.color = '#4169E1';
  active.style.borderBottomColor = '#4169E1';

  document.getElementById('adminJudges').classList.add('hidden');
  document.getElementById('adminSubmissions').classList.add('hidden');
  document.getElementById('adminLimits').classList.add('hidden');
  document.getElementById('adminResults').classList.add('hidden');
  document.getElementById('admin' + (tab === 'judges' ? 'Judges' : tab === 'submissions' ? 'Submissions' : tab === 'limits' ? 'Limits' : 'Results')).classList.remove('hidden');

  if (tab === 'results') renderAdminSummary();
}

async function renderAdminJudges() {
  const scores = await api('/api/admin/scores');
  const tbody = document.getElementById('judgesTable');

  const judgeData = [
    { name: 'Sarah M.', division: 'english', status: 'Active' },
    { name: 'Pieter K.', division: 'afrikaans', status: 'Active' },
    { name: 'Rebecca L.', division: 'gospel', status: 'Active' },
    { name: 'David N.', division: 'praiseandworship', status: 'Active' }
  ];

  tbody.innerHTML = judgeData.map(j => {
    const scoreCount = Object.values(scores).filter(s => s[j.name]).length;
    return `
      <tr>
        <td style="font-weight:600;">${j.name}</td>
        <td><span class="tag tag-${j.division === 'praiseandworship' ? 'pw' : j.division}">${divColors[j.division].name}</span></td>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#228B22;margin-right:6px;"></span>${j.status}</td>
        <td>${scoreCount}</td>
      </tr>
    `;
  }).join('');
}

function filterAdmin(tag) {
  adminFilter = tag;
  document.querySelectorAll('[data-af]').forEach(b => {
    const isActive = b.dataset.af === tag;
    b.classList.toggle('active', isActive);
    if (tag === 'all') {
      b.style.background = isActive ? '#1a1a1a' : 'transparent';
      b.style.color = isActive ? '#fff' : '#1a1a1a';
    }
  });
  renderAdminSubmissions();
}

async function renderAdminSubmissions() {
  const container = document.getElementById('adminSubmissionList');
  const data = await api('/api/admin/submissions');
  const scores = await api('/api/admin/scores');

  let subs = data;
  if (adminFilter !== 'all') subs = subs.filter(s => s.tags.includes(adminFilter));

  container.innerHTML = subs.map(sub => {
    const subScores = scores[sub.id] || {};
    const judgeCount = Object.keys(subScores).length;
    const allPcts = Object.values(subScores).map(s => s.total);
    const avg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${sub.title}</div>
            <div class="card-meta">by ${sub.author} · ${sub.tags.map(t => '#' + t).join(' ')}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#666;">${judgeCount} judge${judgeCount !== 1 ? 's' : ''} scored</div>
            <div style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;">${avg ? avg + '%' : '—'}</div>
          </div>
        </div>
        ${sub.entryType === 'challenge' ? '<span class="challenge-badge">Challenge</span>' : ''}
        <div style="margin-top:10px;font-size:12px;color:#999;">
          ${Object.entries(subScores).map(([judge, data]) => `${judge}: ${data.total}%`).join(' · ') || 'No scores yet'}
        </div>
      </div>
    `;
  }).join('');
}

async function renderAdminLimits() {
  const data = await api('/api/admin/limits');
  const tbody = document.getElementById('limitsTable');

  const entries = Object.entries(data).map(([key, val]) => {
    const name = key.split('_')[0];
    return { name, ...val };
  });

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td style="font-weight:500;">${e.name}</td>
      <td>${e.top20}/2</td>
      <td>${e.challenge}/1</td>
      <td>
        ${e.top20 >= 2 && e.challenge >= 1 
          ? '<span style="color:#C41E3A;font-weight:500;">Full</span>' 
          : '<span style="color:#228B22;font-weight:500;">Open</span>'}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px;">No entries yet</td></tr>';
}

async function renderAdminSummary() {
  const container = document.getElementById('adminScoreSummary');
  const scores = await api('/api/admin/scores');
  const subs = await api('/api/admin/submissions');

  const scoredCount = Object.keys(scores).length;
  const allAvgs = [];
  Object.entries(scores).forEach(([subId, subScores]) => {
    const pcts = Object.values(subScores).map(s => s.total);
    if (pcts.length) allAvgs.push(Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length));
  });

  const leader = allAvgs.length ? subs.find(s => s.id === parseInt(Object.keys(scores)[allAvgs.indexOf(Math.max(...allAvgs))])) : null;

  container.innerHTML = `
    <div style="font-size:14px;margin-bottom:8px;">
      <span style="color:#666;">Total submissions scored:</span> 
      <span style="font-weight:600;">${scoredCount} / ${subs.length}</span>
    </div>
    <div style="font-size:14px;margin-bottom:8px;">
      <span style="color:#666;">Current leader:</span> 
      <span style="font-weight:600;">${leader ? leader.title : '—'}</span> ${leader ? '(' + Math.max(...allAvgs) + '%)' : ''}
    </div>
    <div style="font-size:14px;">
      <span style="color:#666;">Results status:</span> 
      <span style="font-weight:600;color:${resultsRevealed ? '#228B22' : '#B8960C'};">
        ${resultsRevealed ? 'Revealed to public' : 'Hidden until reveal'}
      </span>
    </div>
  `;
}

async function revealResults() {
  await api('/api/admin/reveal', { method: 'POST' });
  resultsRevealed = true;
  showToast('Results revealed to public');
  renderAdminSummary();
}

async function hideResults() {
  await api('/api/admin/hide', { method: 'POST' });
  resultsRevealed = false;
  showToast('Results hidden');
  renderAdminSummary();
}

// ===== INIT =====
async function init() {
  const week = await api('/api/week');
  document.getElementById('currentWeekOption').textContent = 'Week of ' + week.weekId;
}
init();
