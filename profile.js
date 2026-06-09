/* ============================================================
   profile.js — Profile page logic
   ============================================================ */

(function () {
  'use strict';

  const API_BASE =
    (window.TGR_API && window.TGR_API.base) ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : `${location.protocol}//${location.hostname}:5000`);

  const TOKEN_KEY = 'tgr_token';
  const USER_KEY = 'tgr_user';
  const WISHLIST_KEY = 'tgr_wishlist';

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
      setToken(null); setUser(null);
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

  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'toast show ' + (type || '');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  document.getElementById('logoutBtn').addEventListener('click', function () {
    setToken(null); setUser(null);
    location.href = 'index.html';
  });

  function renderPfp(user) {
    const wrap = document.getElementById('pfpWrap');
    if (user.pfpPath) {
      wrap.innerHTML = `<img src="${escapeHtml(user.pfpPath)}?t=${Date.now()}" alt="profile">`;
    } else {
      const fallback = (user.name || user.email || '?').charAt(0).toUpperCase();
      wrap.textContent = fallback;
    }
  }

  function fillUser(user) {
    document.getElementById('displayName').textContent = user.name;
    document.getElementById('displayTag').textContent = '@' + user.tag;
    document.getElementById('nameInput').value = user.name;
    document.getElementById('tagInput').value = user.tag;
    document.getElementById('infoEmail').textContent = user.email;
    document.getElementById('infoRole').innerHTML = user.role === 'admin'
      ? '<span style="color:var(--accent-strong)">Admin</span>'
      : 'User';
    document.getElementById('infoJoined').textContent = new Date(user.createdAt).toLocaleDateString();
    const wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
    document.getElementById('infoWishlist').textContent = wishlist.length;
    if (user.role === 'admin') {
      document.getElementById('adminLink').style.display = '';
    }
    renderPfp(user);
  }

  async function init() {
    if (!getToken()) { location.href = 'index.html'; return; }
    try {
      const { user } = await api('/api/auth/me');
      setUser(user);
      fillUser(user);
    } catch (e) {}
  }

  document.getElementById('profileForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('nameInput').value.trim();
    const tag = document.getElementById('tagInput').value.trim();
    try {
      const { user } = await api('/api/users/me', {
        method: 'PUT',
        body: { name, tag }
      });
      setUser(user);
      fillUser(user);
      toast('Profile updated', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('uploadPfpBtn').addEventListener('click', async function () {
    const f = document.getElementById('pfpFile').files[0];
    if (!f) return toast('Pick an image first', 'error');
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
      const { user } = await api('/api/users/me', {
        method: 'PUT',
        body: { pfpPath: data.path }
      });
      setUser(user);
      fillUser(user);
      toast('Profile picture updated', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('removePfpBtn').addEventListener('click', async function () {
    if (!confirm('Remove your profile picture?')) return;
    try {
      const { user } = await api('/api/users/me', {
        method: 'PUT',
        body: { pfpPath: '' }
      });
      setUser(user);
      fillUser(user);
      toast('Picture removed', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  init();
})();
