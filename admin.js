/* ============================================================
   admin.js — Admin panel logic for The Game Repository
   - Auth-guards the page (redirects non-admins)
   - Wires up CRUD for all 8 collections
   ============================================================ */

(function () {
  'use strict';

  const API_BASE =
    (window.TGR_API && window.TGR_API.base) ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : `${location.protocol}//${location.hostname}:5000`);

  document.getElementById('apiBaseDisplay').textContent = API_BASE;

  const TOKEN_KEY = 'tgr_token';
  const USER_KEY = 'tgr_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }
  function setUser(u) {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (res.status === 401 || res.status === 403) {
      setToken(null);
      setUser(null);
      location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'toast show ' + (type || '');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------- Modal ---------- */
  const modalBg = document.getElementById('modalBg');
  const modalCard = document.getElementById('modalCard');
  function openModal(html) {
    modalCard.innerHTML =
      '<button class="close-x" onclick="document.getElementById(\'modalBg\').classList.remove(\'open\')">✕</button>' +
      html;
    modalBg.classList.add('open');
  }
  function closeModal() { modalBg.classList.remove('open'); }
  modalBg.addEventListener('click', e => { if (e.target === modalBg) closeModal(); });

  /* ---------- Auth gate ---------- */
  async function ensureAdmin() {
    if (!getToken()) { location.href = 'index.html'; return; }
    try {
      const { user } = await api('/api/auth/me');
      if (user.role !== 'admin') { location.href = 'index.html'; return; }
      setUser(user);
      document.getElementById('userInfo').innerHTML =
        `<strong>${escapeHtml(user.name)}</strong> · @${escapeHtml(user.tag)} · <span style="color:var(--accent-strong)">${escapeHtml(user.role)}</span>`;
    } catch (e) {
      location.href = 'index.html';
    }
  }
  document.getElementById('logoutBtn').addEventListener('click', function () {
    setToken(null); setUser(null); location.href = 'index.html';
  });

  /* ---------- Section router ---------- */
  const sections = ['dashboard', 'games', 'reviews', 'queue', 'streaming', 'trending', 'notifications', 'site', 'users'];
  function showSection(name) {
    sections.forEach(s => {
      const el = document.getElementById('sec-' + s);
      if (el) el.style.display = s === name ? '' : 'none';
    });
    document.querySelectorAll('#sidebar a').forEach(a => {
      a.classList.toggle('active', a.dataset.section === name);
    });
    if (name === 'dashboard') loadDashboard();
    if (name === 'games') loadGames();
    if (name === 'reviews') loadReviews();
    if (name === 'queue') loadQueue();
    if (name === 'streaming') loadStreaming();
    if (name === 'trending') loadTrending();
    if (name === 'notifications') loadNotifications();
    if (name === 'site') loadSite();
    if (name === 'users') loadUsers();
  }
  document.querySelectorAll('#sidebar a').forEach(a => {
    a.addEventListener('click', () => showSection(a.dataset.section));
  });

  /* ---------- Dashboard ---------- */
  async function loadDashboard() {
    try {
      const [{ games }, { reviews }, { users }] = await Promise.all([
        api('/api/games'),
        api('/api/reviews/all').catch(() => ({ reviews: [] })),
        api('/api/users').catch(() => ({ users: [] }))
      ]);
      document.getElementById('statGames').textContent = games.length;
      document.getElementById('statReviews').textContent = reviews.length;
      document.getElementById('statUsers').textContent = users.length;
      const totalOnline = games.reduce((s, g) => s + (g.playersOnline || 0), 0);
      document.getElementById('statOnline').textContent = totalOnline.toLocaleString();
    } catch (e) { toast(e.message, 'error'); }
  }

  /* ---------- Games ---------- */
  async function loadGames() {
    try {
      const { games } = await api('/api/games');
      const tbody = document.querySelector('#gamesTable tbody');
      tbody.innerHTML = games.map(g => `
        <tr data-id="${g._id}">
          <td>${g.coverImage ? `<img class="cover" src="${escapeHtml(g.coverImage)}" onerror="this.style.display='none'">` : '<div class="cover"></div>'}</td>
          <td><strong>${escapeHtml(g.title)}</strong><br><span style="color:var(--muted);font-size:0.75rem">${escapeHtml(g.publisher || '')}</span></td>
          <td><span class="badge badge-soft">${escapeHtml(g.section)}</span></td>
          <td>${g.starRating?.toFixed(1) || '–'} <small style="color:var(--muted)">(${g.ratingCount || 0})</small></td>
          <td>${(g.playersOnline || 0).toLocaleString()}</td>
          <td>${g.cloudReady ? '<span class="badge badge-on">on</span>' : '<span class="badge badge-off">off</span>'}</td>
          <td>
            <button class="btn btn-ghost btn-sm" data-edit="${g._id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${g._id}">Delete</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="7" class="empty">No games yet. Click "+ New Game".</td></tr>';
      tbody.querySelectorAll('[data-edit]').forEach(b => {
        b.addEventListener('click', () => editGame(b.dataset.edit, games));
      });
      tbody.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', () => deleteItem('/api/games/' + b.dataset.del, loadGames, 'Game deleted'));
      });
    } catch (e) { toast(e.message, 'error'); }
  }

  function gameForm(g) {
    g = g || {};
    return `
      <h3>${g._id ? 'Edit Game' : 'New Game'}</h3>
      <form id="gameForm" class="stack">
        <div class="grid-2">
          <div><label>Title</label><input name="title" required value="${escapeHtml(g.title || '')}"></div>
          <div><label>Publisher</label><input name="publisher" value="${escapeHtml(g.publisher || 'THE GAME REPOSITORY')}"></div>
        </div>
        <div class="grid-2">
          <div><label>Section</label>
            <select name="section">
              ${['premium','retro','mobile','niche','ios','trending'].map(s => `<option ${g.section === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div><label>Catalog code</label><input name="catalogCode" value="${escapeHtml(g.catalogCode || '')}"></div>
        </div>
        <div class="grid-2">
          <div><label>Icon (emoji)</label><input name="icon" value="${escapeHtml(g.icon || '🎮')}"></div>
          <div><label>Stream URL (direct link)</label><input name="streamUrl" value="${escapeHtml(g.streamUrl || '')}"></div>
        </div>
        <div><label>Genres (comma separated)</label><input name="genresCsv" value="${escapeHtml((g.genres || []).join(', '))}"></div>
        <div><label>Description</label><textarea name="description">${escapeHtml(g.description || '')}</textarea></div>
        <div class="grid-2">
          <div><label>Star rating (0-5)</label><input name="starRating" type="number" step="0.1" min="0" max="5" value="${g.starRating || 4.5}"></div>
          <div><label>Rating count</label><input name="ratingCount" type="number" min="0" value="${g.ratingCount || 0}"></div>
        </div>
        <div class="grid-2">
          <div><label>Players online (fake)</label><input name="playersOnline" type="number" min="0" value="${g.playersOnline || 1500}"></div>
          <div><label>Order</label><input name="order" type="number" value="${g.order || 0}"></div>
        </div>
        <div>
          <label>Cover image (upload or path)</label>
          <div class="row">
            <input name="coverImage" id="coverImageInput" value="${escapeHtml(g.coverImage || '')}" placeholder="images/yourfile.jpg">
            <input type="file" id="coverFile" accept="image/*" style="max-width:200px">
            <button type="button" class="btn btn-ghost btn-sm" id="uploadCoverBtn">Upload</button>
          </div>
          <img id="coverPreview" class="preview-cover" style="margin-top:0.5rem;${g.coverImage ? '' : 'display:none'}" src="${escapeHtml(g.coverImage || '')}">
        </div>
        <div><label>Cloud Ready badge</label>
          <select name="cloudReady"><option value="true" ${g.cloudReady ? 'selected' : ''}>Yes</option><option value="false" ${!g.cloudReady ? 'selected' : ''}>No</option></select>
        </div>
        <div class="row right">
          <button type="button" class="btn btn-ghost" onclick="document.getElementById('modalBg').classList.remove('open')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `;
  }

  function attachGameFormHandlers(g) {
    const form = document.getElementById('gameForm');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const body = {
        title: fd.get('title'),
        publisher: fd.get('publisher'),
        section: fd.get('section'),
        catalogCode: fd.get('catalogCode'),
        icon: fd.get('icon'),
        streamUrl: fd.get('streamUrl'),
        genres: String(fd.get('genresCsv') || '').split(',').map(s => s.trim()).filter(Boolean),
        description: fd.get('description'),
        starRating: parseFloat(fd.get('starRating')) || 0,
        ratingCount: parseInt(fd.get('ratingCount'), 10) || 0,
        playersOnline: parseInt(fd.get('playersOnline'), 10) || 0,
        order: parseInt(fd.get('order'), 10) || 0,
        coverImage: fd.get('coverImage'),
        cloudReady: fd.get('cloudReady') === 'true'
      };
      try {
        if (g && g._id) {
          await api('/api/games/' + g._id, { method: 'PUT', body });
          toast('Game updated', 'ok');
        } else {
          await api('/api/games', { method: 'POST', body });
          toast('Game created', 'ok');
        }
        closeModal();
        loadGames();
        loadDashboard();
      } catch (err) { toast(err.message, 'error'); }
    });
    const uploadBtn = document.getElementById('uploadCoverBtn');
    uploadBtn.addEventListener('click', async function () {
      const f = document.getElementById('coverFile').files[0];
      if (!f) return toast('Pick a file first', 'error');
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch(API_BASE + '/api/upload/image', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getToken() },
          body: fd
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        document.getElementById('coverImageInput').value = data.path;
        const prev = document.getElementById('coverPreview');
        prev.src = data.path;
        prev.style.display = '';
        toast('Uploaded', 'ok');
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function editGame(id, games) {
    const g = games.find(x => x._id === id);
    openModal(gameForm(g));
    attachGameFormHandlers(g);
  }
  document.querySelector('[data-add="game"]').addEventListener('click', function () {
    openModal(gameForm({}));
    attachGameFormHandlers(null);
  });

  /* ---------- Reviews ---------- */
  async function loadReviews() {
    try {
      const [{ reviews }, { games }] = await Promise.all([
        api('/api/reviews/all'),
        api('/api/games')
      ]);
      const gameMap = Object.fromEntries(games.map(g => [g._id, g.title]));
      const tbody = document.querySelector('#reviewsTable tbody');
      tbody.innerHTML = reviews.map(r => `
        <tr data-id="${r._id}">
          <td><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${escapeHtml(r.avatarColor || '#7c6dfa')};vertical-align:middle;margin-right:6px"></span>${escapeHtml(r.username)}</td>
          <td>${escapeHtml(gameMap[r.game] || '–')}</td>
          <td>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.text)}</td>
          <td>${escapeHtml(r.timestampLabel)}</td>
          <td>
            <button class="btn btn-ghost btn-sm" data-edit-r="${r._id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del-r="${r._id}">Delete</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" class="empty">No reviews yet.</td></tr>';
      tbody.querySelectorAll('[data-edit-r]').forEach(b => {
        b.addEventListener('click', () => editReview(b.dataset.editR, reviews, games));
      });
      tbody.querySelectorAll('[data-del-r]').forEach(b => {
        b.addEventListener('click', () => deleteItem('/api/reviews/' + b.dataset.delR, loadReviews, 'Review deleted'));
      });
    } catch (e) { toast(e.message, 'error'); }
  }

  function reviewForm(r, games) {
    r = r || {};
    return `
      <h3>${r._id ? 'Edit Review' : 'New Review'}</h3>
      <form id="reviewForm" class="stack">
        <div class="grid-2">
          <div><label>Username</label><input name="username" required value="${escapeHtml(r.username || '')}"></div>
          <div><label>Avatar color (hex)</label><input name="avatarColor" type="text" value="${escapeHtml(r.avatarColor || '#7c6dfa')}"></div>
        </div>
        <div class="grid-2">
          <div><label>Game</label>
            <select name="game" required>
              ${games.map(g => `<option value="${g._id}" ${r.game === g._id ? 'selected' : ''}>${escapeHtml(g.title)}</option>`).join('')}
            </select>
          </div>
          <div><label>Stars (1-5)</label><input name="stars" type="number" min="1" max="5" value="${r.stars || 5}"></div>
        </div>
        <div><label>Text</label><textarea name="text" required>${escapeHtml(r.text || '')}</textarea></div>
        <div><label>Timestamp label (e.g. "1 day ago")</label><input name="timestampLabel" value="${escapeHtml(r.timestampLabel || '1 day ago')}"></div>
        <div class="row right">
          <button type="button" class="btn btn-ghost" onclick="document.getElementById('modalBg').classList.remove('open')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `;
  }

  function attachReviewFormHandlers(r) {
    document.getElementById('reviewForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        username: fd.get('username'),
        avatarColor: fd.get('avatarColor'),
        game: fd.get('game'),
        stars: parseInt(fd.get('stars'), 10) || 5,
        text: fd.get('text'),
        timestampLabel: fd.get('timestampLabel')
      };
      try {
        if (r && r._id) {
          await api('/api/reviews/' + r._id, { method: 'PUT', body });
          toast('Review updated', 'ok');
        } else {
          await api('/api/reviews', { method: 'POST', body });
          toast('Review created', 'ok');
        }
        closeModal();
        loadReviews();
        loadDashboard();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function editReview(id, reviews, games) {
    const r = reviews.find(x => x._id === id);
    openModal(reviewForm(r, games));
    attachReviewFormHandlers(r);
  }
  document.querySelector('[data-add="review"]').addEventListener('click', async function () {
    const { games } = await api('/api/games');
    if (!games.length) return toast('Create a game first', 'error');
    openModal(reviewForm({}, games));
    attachReviewFormHandlers(null);
  });

  /* ---------- Queue ---------- */
  async function loadQueue() {
    try {
      const { items } = await api('/api/queue');
      const tbody = document.querySelector('#queueTable tbody');
      tbody.innerHTML = items.map(q => `
        <tr data-id="${q._id}">
          <td>${escapeHtml(q.game?.title || '–')}</td>
          <td><input type="number" data-field="position" value="${q.position}" style="max-width:120px"></td>
          <td><input type="text" data-field="estimatedWait" value="${escapeHtml(q.estimatedWait)}" style="max-width:120px"></td>
          <td><input type="number" data-field="onlineNow" value="${q.onlineNow}" style="max-width:120px"></td>
          <td><button class="btn btn-primary btn-sm" data-save-q="${q._id}">Save</button></td>
        </tr>
      `).join('') || '<tr><td colspan="5" class="empty">No queue settings yet. They are auto-created on seed.</td></tr>';
      tbody.querySelectorAll('[data-save-q]').forEach(b => {
        b.addEventListener('click', async function () {
          const tr = b.closest('tr');
          const body = {
            position: parseInt(tr.querySelector('[data-field=position]').value, 10) || 0,
            estimatedWait: tr.querySelector('[data-field=estimatedWait]').value,
            onlineNow: parseInt(tr.querySelector('[data-field=onlineNow]').value, 10) || 0
          };
          try {
            await api('/api/queue/' + b.dataset.saveQ, { method: 'PUT', body });
            toast('Queue updated', 'ok');
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    } catch (e) { toast(e.message, 'error'); }
  }

  /* ---------- Streaming ---------- */
  let streamingGamesCache = [];
  async function loadStreaming() {
    try {
      const [{ games }] = await Promise.all([api('/api/games')]);
      streamingGamesCache = games;
      const sel = document.getElementById('streamGameSelect');
      sel.innerHTML = games.map(g => `<option value="${g._id}">${escapeHtml(g.title)}</option>`).join('');
      sel.onchange = loadStreamingForSelected;
      loadStreamingForSelected();
    } catch (e) { toast(e.message, 'error'); }
  }
  async function loadStreamingForSelected() {
    const sel = document.getElementById('streamGameSelect');
    const id = sel.value;
    if (!id) return;
    try {
      const { item } = await api('/api/streaming/by-game/' + id);
      const data = item || { gpuOptions: [], qualityOptions: [], frameRateOptions: [] };
      const gpuList = document.getElementById('gpuList');
      gpuList.innerHTML = (data.gpuOptions || []).map((g, i) => `
        <div class="row" data-gpu-row="${i}" style="background:rgba(255,255,255,0.03);padding:0.5rem;border-radius:6px">
          <input type="text" data-g="name" value="${escapeHtml(g.name)}" placeholder="GPU name" style="flex:2">
          <input type="text" data-g="ping" value="${escapeHtml(g.ping)}" placeholder="ping" style="max-width:80px">
          <input type="text" data-g="nodeLocation" value="${escapeHtml(g.nodeLocation)}" placeholder="node" style="max-width:140px">
          <input type="number" data-g="freeSlots" value="${g.freeSlots}" placeholder="slots" style="max-width:80px">
          <label class="switch"><input type="checkbox" data-g="isFull" ${g.isFull ? 'checked' : ''}><span class="slider"></span></label>
          <button type="button" class="btn btn-danger btn-sm" data-rm-gpu>✕</button>
        </div>
      `).join('');
      gpuList.querySelectorAll('[data-rm-gpu]').forEach(b => {
        b.addEventListener('click', e => e.target.closest('[data-gpu-row]').remove());
      });
      document.getElementById('qualityOptions').value = (data.qualityOptions || []).join('\n');
      document.getElementById('frameRateOptions').value = (data.frameRateOptions || []).join('\n');
    } catch (e) { toast(e.message, 'error'); }
  }
  document.getElementById('addGpuBtn').addEventListener('click', function () {
    const list = document.getElementById('gpuList');
    const div = document.createElement('div');
    div.className = 'row';
    div.style = 'background:rgba(255,255,255,0.03);padding:0.5rem;border-radius:6px';
    div.innerHTML = `
      <input type="text" data-g="name" placeholder="GPU name" style="flex:2">
      <input type="text" data-g="ping" value="12ms" placeholder="ping" style="max-width:80px">
      <input type="text" data-g="nodeLocation" value="US-East Nodes" placeholder="node" style="max-width:140px">
      <input type="number" data-g="freeSlots" value="8" placeholder="slots" style="max-width:80px">
      <label class="switch"><input type="checkbox" data-g="isFull"><span class="slider"></span></label>
      <button type="button" class="btn btn-danger btn-sm">✕</button>
    `;
    list.appendChild(div);
    div.querySelector('button').addEventListener('click', () => div.remove());
  });
  document.getElementById('saveStreamBtn').addEventListener('click', async function () {
    const id = document.getElementById('streamGameSelect').value;
    if (!id) return;
    const gpuOptions = Array.from(document.querySelectorAll('#gpuList [data-gpu-row]')).map(row => ({
      name: row.querySelector('[data-g=name]').value,
      ping: row.querySelector('[data-g=ping]').value,
      nodeLocation: row.querySelector('[data-g=nodeLocation]').value,
      freeSlots: parseInt(row.querySelector('[data-g=freeSlots]').value, 10) || 0,
      isFull: row.querySelector('[data-g=isFull]').checked
    }));
    const body = {
      gpuOptions,
      qualityOptions: document.getElementById('qualityOptions').value.split('\n').map(s => s.trim()).filter(Boolean),
      frameRateOptions: document.getElementById('frameRateOptions').value.split('\n').map(s => s.trim()).filter(Boolean)
    };
    try {
      await api('/api/streaming', { method: 'POST', body: Object.assign({ game: id }, body) });
      toast('Streaming config saved', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ---------- Trending ---------- */
  async function loadTrending() {
    try {
      const [{ config }, { games }] = await Promise.all([api('/api/trending'), api('/api/games')]);
      document.getElementById('trendingEnabled').checked = !!config.enabled;
      document.getElementById('trendingTitle').value = config.title || '';
      const tbody = document.querySelector('#trendingTable tbody');
      const gameMap = Object.fromEntries(games.map(g => [g._id, g.title]));
      const items = (config.items || []).slice().sort((a, b) => a.rank - b.rank);
      tbody.innerHTML = items.map((it, i) => `
        <tr data-trending-row data-game-id="${it.game}">
          <td>#${i + 1}</td>
          <td>
            <select data-trending-game>
              ${games.map(g => `<option value="${g._id}" ${g._id === it.game ? 'selected' : ''}>${escapeHtml(g.title)}</option>`).join('')}
            </select>
          </td>
          <td><input type="number" data-trending-rank value="${i + 1}" style="max-width:80px"></td>
          <td><button type="button" class="btn btn-danger btn-sm" data-rm-trending>Remove</button></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="empty">No trending items yet.</td></tr>';
      tbody.querySelectorAll('[data-rm-trending]').forEach(b => {
        b.addEventListener('click', e => e.target.closest('tr').remove());
      });
    } catch (e) { toast(e.message, 'error'); }
  }
  document.getElementById('saveTrendingBtn').addEventListener('click', async function () {
    const rows = Array.from(document.querySelectorAll('#trendingTable tbody tr[data-trending-row]'));
    const items = rows.map((r, i) => ({
      game: r.querySelector('[data-trending-game]').value,
      rank: parseInt(r.querySelector('[data-trending-rank]').value, 10) || (i + 1),
      rankLabel: '#' + (i + 1)
    }));
    try {
      await api('/api/trending', {
        method: 'PUT',
        body: {
          enabled: document.getElementById('trendingEnabled').checked,
          title: document.getElementById('trendingTitle').value,
          items
        }
      });
      toast('Trending saved', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ---------- Notifications ---------- */
  async function loadNotifications() {
    try {
      const { config } = await api('/api/notifications');
      document.getElementById('notifEnabled').checked = !!config.enabled;
      document.getElementById('notifInterval').value = config.intervalSeconds;
      document.getElementById('notifPool').value = (config.usernamePool || []).join('\n');
    } catch (e) { toast(e.message, 'error'); }
  }
  document.getElementById('saveNotifBtn').addEventListener('click', async function () {
    try {
      await api('/api/notifications', {
        method: 'PUT',
        body: {
          enabled: document.getElementById('notifEnabled').checked,
          intervalSeconds: parseInt(document.getElementById('notifInterval').value, 10) || 15,
          usernamePool: document.getElementById('notifPool').value.split('\n').map(s => s.trim()).filter(Boolean)
        }
      });
      toast('Notifications saved', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ---------- Site content ---------- */
  async function loadSite() {
    try {
      const { config } = await api('/api/site');
      document.getElementById('siteEyebrow').value = config.heroEyebrow || '';
      document.getElementById('siteHeadline').value = config.heroHeadline || '';
      document.getElementById('siteHeadlineEm').value = config.heroHeadlineEm || '';
      document.getElementById('siteSubheadline').value = config.heroSubheadline || '';
      document.getElementById('siteHiwTitle').value = config.howItWorksTitle || '';
      const steps = document.getElementById('hiwSteps');
      steps.innerHTML = (config.howItWorksSteps || []).map((s, i) => `
        <div class="row" data-hiw-row style="background:rgba(255,255,255,0.03);padding:0.5rem;border-radius:6px">
          <input type="text" data-h="icon" value="${escapeHtml(s.icon || '')}" placeholder="icon" style="max-width:50px">
          <input type="text" data-h="title" value="${escapeHtml(s.title || '')}" placeholder="Title" style="flex:1">
          <input type="text" data-h="description" value="${escapeHtml(s.description || '')}" placeholder="Description" style="flex:2">
          <button type="button" class="btn btn-danger btn-sm" data-rm-hiw>✕</button>
        </div>
      `).join('');
      steps.querySelectorAll('[data-rm-hiw]').forEach(b => {
        b.addEventListener('click', e => e.target.closest('[data-hiw-row]').remove());
      });
      const cols = document.getElementById('footerCols');
      cols.innerHTML = (config.footerColumns || []).map((c, i) => `
        <div data-fc-row style="background:rgba(255,255,255,0.03);padding:0.6rem;border-radius:6px">
          <div class="row">
            <input type="text" data-fc-title value="${escapeHtml(c.title || '')}" placeholder="Column title" style="flex:1">
            <button type="button" class="btn btn-danger btn-sm" data-rm-fc>✕</button>
          </div>
          <div class="pill-input" data-fc-links>
            ${(c.links || []).map(l => `<span class="pill">${escapeHtml(l.label)}<button data-rm-link="${escapeHtml(l.label)}">✕</button></span>`).join('')}
            <input type="text" data-fc-link-input placeholder="Label|url (Enter to add)">
          </div>
        </div>
      `).join('');
      cols.querySelectorAll('[data-rm-fc]').forEach(b => {
        b.addEventListener('click', e => e.target.closest('[data-fc-row]').remove());
      });
      cols.querySelectorAll('[data-fc-link-input]').forEach(input => {
        input.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = input.value.trim();
          if (!v) return;
          const [label, href] = v.split('|');
          const pill = document.createElement('span');
          pill.className = 'pill';
          pill.innerHTML = `${escapeHtml(label)}<button data-rm-link="${escapeHtml(label)}">✕</button>`;
          pill.querySelector('button').addEventListener('click', () => pill.remove());
          input.parentElement.insertBefore(pill, input);
          input.value = '';
        });
      });
      cols.querySelectorAll('[data-rm-link]').forEach(b => {
        b.addEventListener('click', e => e.target.parentElement.remove());
      });
    } catch (e) { toast(e.message, 'error'); }
  }
  document.getElementById('addHiwBtn').addEventListener('click', function () {
    const steps = document.getElementById('hiwSteps');
    const div = document.createElement('div');
    div.className = 'row';
    div.style = 'background:rgba(255,255,255,0.03);padding:0.5rem;border-radius:6px';
    div.setAttribute('data-hiw-row', '');
    div.innerHTML = `
      <input type="text" data-h="icon" value="⚡" placeholder="icon" style="max-width:50px">
      <input type="text" data-h="title" placeholder="Title" style="flex:1">
      <input type="text" data-h="description" placeholder="Description" style="flex:2">
      <button type="button" class="btn btn-danger btn-sm">✕</button>
    `;
    div.querySelector('button').addEventListener('click', () => div.remove());
    steps.appendChild(div);
  });
  document.getElementById('addFooterColBtn').addEventListener('click', function () {
    const cols = document.getElementById('footerCols');
    const div = document.createElement('div');
    div.setAttribute('data-fc-row', '');
    div.style = 'background:rgba(255,255,255,0.03);padding:0.6rem;border-radius:6px';
    div.innerHTML = `
      <div class="row">
        <input type="text" data-fc-title placeholder="Column title" style="flex:1">
        <button type="button" class="btn btn-danger btn-sm" data-rm-fc>✕</button>
      </div>
      <div class="pill-input" data-fc-links>
        <input type="text" data-fc-link-input placeholder="Label|url (Enter to add)">
      </div>
    `;
    div.querySelector('[data-rm-fc]').addEventListener('click', () => div.remove());
    div.querySelector('[data-fc-link-input]').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = this.value.trim();
      if (!v) return;
      const [label, href] = v.split('|');
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = `${escapeHtml(label)}<button>✕</button>`;
      pill.querySelector('button').addEventListener('click', () => pill.remove());
      this.parentElement.insertBefore(pill, this);
      this.value = '';
    });
    cols.appendChild(div);
  });
  document.getElementById('saveSiteBtn').addEventListener('click', async function () {
    const body = {
      heroEyebrow: document.getElementById('siteEyebrow').value,
      heroHeadline: document.getElementById('siteHeadline').value,
      heroHeadlineEm: document.getElementById('siteHeadlineEm').value,
      heroSubheadline: document.getElementById('siteSubheadline').value,
      howItWorksTitle: document.getElementById('siteHiwTitle').value,
      howItWorksSteps: Array.from(document.querySelectorAll('#hiwSteps [data-hiw-row]')).map(r => ({
        icon: r.querySelector('[data-h=icon]').value,
        title: r.querySelector('[data-h=title]').value,
        description: r.querySelector('[data-h=description]').value
      })),
      footerColumns: Array.from(document.querySelectorAll('#footerCols [data-fc-row]')).map(r => {
        const pills = r.querySelectorAll('[data-fc-links] .pill');
        return {
          title: r.querySelector('[data-fc-title]').value,
          links: Array.from(pills).map(p => ({ label: p.firstChild ? p.firstChild.textContent : '', href: '#' }))
        };
      })
    };
    try {
      await api('/api/site', { method: 'PUT', body });
      toast('Homepage saved', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ---------- Users ---------- */
  async function loadUsers() {
    try {
      const { users } = await api('/api/users');
      const tbody = document.querySelector('#usersTable tbody');
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>@${escapeHtml(u.tag)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${u.role === 'admin' ? '<span class="badge badge-on">admin</span>' : '<span class="badge badge-soft">user</span>'}</td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-ghost btn-sm" data-toggle-role="${u._id}:${u.role}">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>
            <button class="btn btn-danger btn-sm" data-del-u="${u._id}">Delete</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" class="empty">No users yet.</td></tr>';
      tbody.querySelectorAll('[data-toggle-role]').forEach(b => {
        b.addEventListener('click', async function () {
          const [id, role] = b.dataset.toggleRole.split(':');
          try {
            await api('/api/users/' + id + '/role', {
              method: 'PUT',
              body: { role: role === 'admin' ? 'user' : 'admin' }
            });
            toast('Role updated', 'ok');
            loadUsers();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
      tbody.querySelectorAll('[data-del-u]').forEach(b => {
        b.addEventListener('click', () => deleteItem('/api/users/' + b.dataset.delU, loadUsers, 'User deleted'));
      });
    } catch (e) { toast(e.message, 'error'); }
  }

  /* ---------- Generic delete ---------- */
  async function deleteItem(path, reload, msg) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api(path, { method: 'DELETE' });
      toast(msg || 'Deleted', 'ok');
      reload();
      loadDashboard();
    } catch (e) { toast(e.message, 'error'); }
  }

  /* ---------- Init ---------- */
  ensureAdmin().then(() => showSection('dashboard'));
})();
