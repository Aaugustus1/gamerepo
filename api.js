/* ============================================================
   api.js — Frontend integration layer for The Game Repository
   - Does NOT modify the existing index.html inline JS
   - Dynamically injects auth/profile UI into the nav
   - Fetches live data from /api/* endpoints
   - Falls back gracefully when API is offline
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

  /* ---------- Cache (populated on init) ---------- */
  const tgrCache = {
    games: [],
    gamesByTitle: new Map(),
    streaming: new Map(), // gameId -> StreamingConfig
    queue: new Map(),     // gameId -> QueueSetting
    siteConfig: null,
    notifConfig: null
  };

  /* ---------- Token + user helpers ---------- */
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }
  function setUser(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw new Error('Cannot reach server. Is the API running on ' + API_BASE + '?');
    }
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  }

  /* ---------- Inject nav controls ---------- */
  function injectNavControls() {
    const ul = document.querySelector('header .nav-links');
    if (!ul) return;

    if (!document.getElementById('tgr-profile-link')) {
      const li = document.createElement('li');
      li.id = 'tgr-profile-link';
      li.style.display = 'none';
      li.innerHTML = '<a href="profile.html">Profile</a>';
      ul.insertBefore(li, ul.firstChild);
    }

    if (!document.getElementById('tgr-admin-link')) {
      const li = document.createElement('li');
      li.id = 'tgr-admin-link';
      li.style.display = 'none';
      li.innerHTML = '<a href="admin.html" style="color:#a855f7;">Admin</a>';
      ul.insertBefore(li, ul.firstChild);
    }

    if (!document.getElementById('tgr-auth-btn-li')) {
      const li = document.createElement('li');
      li.id = 'tgr-auth-btn-li';
      li.innerHTML = '<a href="#" id="tgr-auth-btn" style="color:#a855f7;">Sign in</a>';
      ul.insertBefore(li, ul.firstChild);
    }
  }

  function refreshNavForUser(user) {
    const profileLi = document.getElementById('tgr-profile-link');
    const adminLi = document.getElementById('tgr-admin-link');
    const authLi = document.getElementById('tgr-auth-btn-li');
    if (!profileLi || !adminLi || !authLi) return;

    if (user) {
      profileLi.style.display = '';
      adminLi.style.display = user.role === 'admin' ? '' : 'none';
      authLi.innerHTML = `<a href="#" id="tgr-auth-btn" style="color: var(--color-muted);">Logout (${escapeHtml(user.name)})</a>`;
    } else {
      profileLi.style.display = 'none';
      adminLi.style.display = 'none';
      authLi.innerHTML = '<a href="#" id="tgr-auth-btn" style="color:#a855f7;">Sign in</a>';
    }

    const btn = document.getElementById('tgr-auth-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (getUser()) {
          setToken(null); setUser(null);
          refreshNavForUser(null);
          showToast('Logged out');
          location.reload();
        } else {
          openAuthModal();
        }
      });
    }
  }

  /* ---------- Toast ---------- */
  function ensureToast() {
    let t = document.getElementById('tgr-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tgr-toast';
      document.body.appendChild(t);
    }
    return t;
  }
  let toastTimer;
  function showToast(message, icon) {
    const t = ensureToast();
    t.innerHTML = '';
    const i = document.createElement('span'); i.textContent = icon || 'ℹ️';
    const m = document.createElement('span'); m.textContent = String(message == null ? '' : message);
    t.appendChild(i); t.appendChild(m);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- Auth modal ---------- */
  let authOverlay;
  function buildAuthModal() {
    if (document.getElementById('tgr-auth-overlay')) {
      authOverlay = document.getElementById('tgr-auth-overlay');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'tgr-auth-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '600'; // above the original modal-overlay (500) and iframe-overlay (500)
    overlay.innerHTML = `
      <div class="modal" role="document" style="max-width: 440px;">
        <button class="modal-close" id="tgr-auth-close" aria-label="Close">✕</button>
        <div class="modal-icon">🔐</div>
        <h2 id="tgr-auth-title">Sign in to your account</h2>
        <p id="tgr-auth-sub" style="text-align:center;color:var(--color-muted);font-size:0.85rem;margin-bottom:1.25rem;">
          Save your wishlist, manage your profile, and unlock admin tools.
        </p>
        <form id="tgr-auth-form" autocomplete="on" style="display:flex;flex-direction:column;gap:0.85rem;">
          <div id="tgr-auth-name-row" style="display:none;">
            <label class="config-label">DISPLAY NAME</label>
            <input name="name" type="text" class="config-select" style="text-align:left;" placeholder="Your name" />
          </div>
          <div id="tgr-auth-tag-row" style="display:none;">
            <label class="config-label">@TAG HANDLE</label>
            <input name="tag" type="text" class="config-select" style="text-align:left;" placeholder="coolhandle" />
          </div>
          <div>
            <label class="config-label">EMAIL</label>
            <input name="email" type="email" required class="config-select" style="text-align:left;" placeholder="you@example.com" />
          </div>
          <div>
            <label class="config-label">PASSWORD</label>
            <input name="password" type="password" required minlength="6" class="config-select" style="text-align:left;" placeholder="At least 6 characters" />
          </div>
          <div id="tgr-auth-error" style="display:none;color:#f56d6d;font-size:0.82rem;text-align:center;"></div>
          <button type="submit" class="btn-launch" id="tgr-auth-submit">Sign in</button>
          <button type="button" id="tgr-auth-switch" class="btn-proceed is-active" style="margin-top:0.25rem;">No account? Register</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    authOverlay = overlay;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeAuthModal();
    });

    document.getElementById('tgr-auth-close').addEventListener('click', closeAuthModal);

    /* BUG FIX: bind Escape only once across re-builds */
    if (!window.__tgrAuthEscapeBound) {
      window.__tgrAuthEscapeBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && authOverlay && authOverlay.classList.contains('is-open')) {
          closeAuthModal();
        }
      });
    }

    const switchBtn = document.getElementById('tgr-auth-switch');
    let mode = 'login';
    function setMode(next) {
      mode = next;
      const title = document.getElementById('tgr-auth-title');
      const sub = document.getElementById('tgr-auth-sub');
      const submit = document.getElementById('tgr-auth-submit');
      const nameRow = document.getElementById('tgr-auth-name-row');
      const tagRow = document.getElementById('tgr-auth-tag-row');
      const nameInput = nameRow.querySelector('input');
      const tagInput = tagRow.querySelector('input');
      if (mode === 'register') {
        title.textContent = 'Create an account';
        sub.textContent = 'The first account becomes admin.';
        submit.textContent = 'Register';
        nameRow.style.display = '';
        tagRow.style.display = '';
        nameInput.required = true;
        tagInput.required = true;
        switchBtn.textContent = 'Already have an account? Sign in';
      } else {
        title.textContent = 'Sign in to your account';
        sub.textContent = 'Save your wishlist, manage your profile, and unlock admin tools.';
        submit.textContent = 'Sign in';
        nameRow.style.display = 'none';
        tagRow.style.display = 'none';
        nameInput.required = false;
        tagInput.required = false;
        /* BUG FIX: clear residual register fields when switching back to login */
        nameInput.value = '';
        tagInput.value = '';
        switchBtn.textContent = 'No account? Register';
      }
    }
    switchBtn.addEventListener('click', function () {
      setMode(mode === 'login' ? 'register' : 'login');
    });

    overlay.querySelector('#tgr-auth-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        email: (fd.get('email') || '').toString().trim(),
        password: (fd.get('password') || '').toString()
      };
      if (mode === 'register') {
        body.name = (fd.get('name') || '').toString().trim();
        body.tag = (fd.get('tag') || '').toString().trim();
      }
      const errEl = document.getElementById('tgr-auth-error');
      errEl.style.display = 'none';
      const submitBtn = document.getElementById('tgr-auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait…';
      try {
        const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const data = await api(path, { method: 'POST', body });
        setToken(data.token);
        setUser(data.user);
        refreshNavForUser(data.user);
        closeAuthModal();
        showToast(`Welcome, ${data.user.name}!`, '✅');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'register' ? 'Register' : 'Sign in';
      }
    });
  }

  function openAuthModal() {
    buildAuthModal();
    authOverlay.classList.add('is-open');
    document.body.classList.add('modal-open');
  }
  function closeAuthModal() {
    if (authOverlay) authOverlay.classList.remove('is-open');
    if (!document.querySelector('.modal-overlay.is-open')) {
      document.body.classList.remove('modal-open');
    }
  }

  /* ---------- Live data: player counts ----------
     BUG FIX: original initPlayerCounts also updates .online-status.
     We now only set the base value `div._playerCount` and let the
     original handler render the display. No more flicker. */
  async function loadLivePlayerCounts() {
    try {
      const { games } = await api('/api/games');
      tgrCache.games = games || [];
      tgrCache.gamesByTitle = new Map(games.map(g => [g.title, g]));
      const statusDivs = document.querySelectorAll('.online-status');
      statusDivs.forEach((div, i) => {
        const g = games[i];
        if (!g) return;
        div.dataset.tgrManaged = '1';
        /* Only set the base; the original tick adds the random delta
           and writes to innerHTML. We don't write to innerHTML ourselves. */
        div._playerCount = g.playersOnline || 1000;
      });

      /* Detail-page navigation: stamp data-id on premium cards so clicks
         can navigate to game.html?id=<mongoId>. */
      const premiumSection = document.querySelector('.showcase-section[aria-labelledby="modern-games-heading"]');
      if (premiumSection) {
        premiumSection.querySelectorAll('.game-card').forEach(card => {
          const titleEl = card.querySelector('.card-title');
          if (!titleEl) return;
          const g = tgrCache.gamesByTitle.get(titleEl.textContent.trim());
          if (g && g._id) card.dataset.gameId = String(g._id);
        });
      }
    } catch (e) {
      /* API offline - keep the original hardcoded behaviour */
    }
  }

  /* ---------- Site settings (hero text) ---------- */
  async function loadSiteSettings() {
    try {
      const { config } = await api('/api/site');
      if (!config) return;
      tgrCache.siteConfig = config;

      /* BUG FIX: build the hero HTML once from config (no fragile string replace) */
      const hero = document.querySelector('.hero h1');
      if (hero && config.heroHeadline) {
        const emText = config.heroHeadlineEm || 'Cloud Gaming';
        const parts = config.heroHeadline.split(/<br\s*\/?>/i);
        hero.innerHTML = parts
          .map(p => {
            const safe = escapeHtml(p);
            /* Re-inject <em> only around the exact emText match */
            const emRe = new RegExp(escapeHtml(emText), 'i');
            return safe.replace(emRe, `<em>${escapeHtml(emText)}</em>`);
          })
          .join('<br>');
      }
      const sub = document.querySelector('.hero-sub');
      if (sub && config.heroSubheadline) sub.textContent = config.heroSubheadline;

      /* BUG FIX: use textContent (was innerHTML) - no XSS via admin-controlled eyebrow */
      const eyebrow = document.querySelector('.hero-eyebrow');
      if (eyebrow && config.heroEyebrow) {
        const text = config.heroEyebrow.replace(/^[•·\-—]\s*/, '').trim();
        eyebrow.textContent = text;
        /* The ::before CSS dot still renders because it's a CSS pseudo, not DOM */
      }
    } catch (e) {}
  }

  /* ---------- Notification ticker ---------- */
  let notifTimer;
  async function startNotificationTicker() {
    try {
      const { config } = await api('/api/notifications');
      tgrCache.notifConfig = config;
      if (!config || !config.enabled) return;
      if (notifTimer) clearInterval(notifTimer);
      const pool = config.usernamePool || [];
      const intervalMs = Math.max(3000, (config.intervalSeconds || 15) * 1000);
      function tick() {
        if (!pool.length) return;
        const user = pool[Math.floor(Math.random() * pool.length)];
        showToast(`${user} just started a cloud session`, '🎮');
      }
      notifTimer = setInterval(tick, intervalMs);
    } catch (e) {}
  }

  /* ---------- Streaming config: pre-fetch + sync modal population ----------
     BUG FIX: instead of opening the modal with hardcoded GPU options and
     then async-swapping them, we attach a CAPTURE-phase click handler that
     runs BEFORE the original. If we have a cached streaming config, we
     populate the modal synchronously and stopImmediatePropagation, so the
     original click handler never runs. If the cache is cold, we fall
     through to the original and let the post-open swap happen. */
  async function prefetchStreamingConfigs() {
    try {
      const { items } = await api('/api/streaming');
      (items || []).forEach(it => { tgrCache.streaming.set(String(it.game), it); });
    } catch (e) {}
  }
  async function prefetchQueueSettings() {
    try {
      const { items } = await api('/api/queue');
      (items || []).forEach(it => { tgrCache.queue.set(String(it.game), it); });
    } catch (e) {}
  }

  function applyStreamingToModal(game, streamCfg, queueCfg) {
    const titleEl = document.getElementById('modal-game-title');
    if (titleEl) titleEl.textContent = game.title;
    if (streamCfg) {
      const qualitySelect = document.querySelector('#modal-panel .config-group:nth-of-type(1) .config-select');
      if (qualitySelect && streamCfg.qualityOptions) {
        qualitySelect.innerHTML = streamCfg.qualityOptions.map(o => `<option>${escapeHtml(o)}</option>`).join('');
      }
      const fpsSelect = document.querySelector('#modal-panel .config-group:nth-of-type(2) .config-select');
      if (fpsSelect && streamCfg.frameRateOptions) {
        fpsSelect.innerHTML = streamCfg.frameRateOptions.map(o => `<option>${escapeHtml(o)}</option>`).join('');
      }
      const container = document.querySelector('#modal-panel .config-group:nth-of-type(3)');
      if (container && streamCfg.gpuOptions && streamCfg.gpuOptions.length) {
        const heading = container.querySelector('.config-label');
        const keep = heading ? heading.outerHTML : '';
        const optionsHtml = streamCfg.gpuOptions
          .map((g, i) => `
            <div class="server-option${i === 0 && !g.isLocked ? ' selected' : ''}${g.isLocked ? ' locked' : ''}">
              <div class="server-info">
                <h4>${escapeHtml(g.name)}</h4>
                <p>Ping: ${escapeHtml(g.ping)} · ${escapeHtml(g.nodeLocation)}</p>
              </div>
              <div class="server-status ${g.isLocked ? 'status-locked' : (g.isFull ? 'status-full' : 'status-free')}">
                ${g.isLocked ? 'Locked 🔒' : (g.isFull ? 'Full Queue' : `${g.freeSlots} Free`)}
              </div>
            </div>
          `).join('');
        container.innerHTML = keep + optionsHtml;
        const opts = container.querySelectorAll('.server-option');
        opts.forEach(opt => {
          opt.addEventListener('click', () => {
            if (opt.classList.contains('locked')) return;
            opts.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
          });
        });
      }
    }
    /* Store queue cfg for use later (queue modal opens from the sponsor flow) */
    if (queueCfg) {
      window.__tgrCurrentQueue = queueCfg;
    }
  }

  /* ---------- Slug helper: derive URL-safe ID from title ---------- */
  function titleToSlug(title) {
    return String(title || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /* ---------- Card navigation: click premium card -> game detail page ---------- */
  function attachCardNavigation() {
    /* Stamp slug-based IDs on premium cards immediately so clicks work without API */
    const premiumSection = document.querySelector('.showcase-section[aria-labelledby="modern-games-heading"]');
    if (premiumSection) {
      premiumSection.querySelectorAll('.game-card').forEach(card => {
        if (card.dataset.gameId) return; // Already has a real API id
        const titleEl = card.querySelector('.card-title');
        if (titleEl) {
          card.dataset.gameId = titleToSlug(titleEl.textContent.trim());
        }
      });
    }

    document.addEventListener('click', function (e) {
      /* Only cards inside the premium section are clickable */
      const card = e.target.closest('.showcase-section[aria-labelledby="modern-games-heading"] .game-card');
      if (!card) return;
      /* Don't navigate if a button inside the card was clicked (play / wishlist / share) */
      if (e.target.closest('.btn-play, .btn-wishlist, .btn-share, a[href]')) return;
      const id = card.dataset.gameId;
      if (!id) return;
      window.location.href = 'game.html?id=' + encodeURIComponent(id);
    });
  }

  function attachStreamingConfig() {
    /* CAPTURE phase so we run before the original bubble-phase click handler */
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.btn-stream-trigger');
      if (!btn) return;

      const title = btn.getAttribute('data-title');
      const game = tgrCache.gamesByTitle.get(title);

      /* Ensure data-link is always set so the original handler can use it */
      if (game && game.streamUrl && !btn.getAttribute('data-link')) {
        btn.setAttribute('data-link', game.streamUrl);
      } else if (!btn.getAttribute('data-link')) {
        btn.setAttribute('data-link', '#');
      }

      /* If the game has no API entry, do nothing — let the inline bubble-phase
         openModal() handler run naturally. This covers all non-premium sections
         (Legacy Console, Mobile, Niche, iOS) that aren't in the API cache. */
      if (!game) return;

      /* If we have a cached streaming config, take full control of the click */
      const streamCfg = tgrCache.streaming.get(String(game._id));
      const queueCfg  = tgrCache.queue.get(String(game._id));
      if (streamCfg) {
        e.stopImmediatePropagation();
        e.preventDefault();
        applyStreamingToModal(game, streamCfg, queueCfg);
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
          overlay.classList.add('is-open');
          document.body.classList.add('modal-open');
          const closeBtn = document.getElementById('modal-close-btn');
          if (closeBtn) closeBtn.focus();
        }
        return;
      }

      /* Cache miss for a known game: let the inline handler open the modal
         first, then async-populate it in the background. */
      (async () => {
        try {
          const [{ item: sCfg }, { item: qCfg }] = await Promise.all([
            api('/api/streaming/by-game/' + game._id),
            api('/api/queue/by-game/' + game._id)
          ]);
          if (sCfg) {
            tgrCache.streaming.set(String(game._id), sCfg);
            applyStreamingToModal(game, sCfg, qCfg);
          }
          if (qCfg) {
            tgrCache.queue.set(String(game._id), qCfg);
            window.__tgrCurrentQueue = qCfg;
          }
        } catch (err) {}
      })();
    }, true /* capture */);
  }

  /* ---------- Reviews: optional preview block ---------- */
  async function loadReviews() {
    try {
      const { reviews } = await api('/api/reviews');
      /* Reviews are shown in admin panel; future use could render them
         inside game detail pages. */
    } catch (e) {}
  }

  /* ---------- PWA / iOS installation logic ---------- */
  let deferredPrompt = null;

  function initPWAInstallation() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallMenuOption(true);
    });

    window.addEventListener('appinstalled', () => {
      showInstallMenuOption(false);
      deferredPrompt = null;
    });

    // Show button on iOS if not standalone (manual guide trigger) or on other platforms if prompt is ready
    const showOption = (isIOS && !isStandalone) || deferredPrompt !== null;
    injectInstallMenuOption(showOption);

    // Auto-trigger iOS bottom banner after 4 seconds if not dismissed
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('tgr_ios_prompt_dismissed');
      if (!dismissed) {
        setTimeout(showIOSInstallPrompt, 4000);
      }
    }
  }

  function injectInstallMenuOption(show = true) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    let existing = document.getElementById('tgr-install-li');
    if (existing) existing.remove();

    const li = document.createElement('li');
    li.id = 'tgr-install-li';
    if (!show) {
      li.style.display = 'none';
    }
    li.innerHTML = '<a href="#" id="tgr-install-btn" style="color: var(--color-accent); font-weight: 500; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.04em;">Install App</a>';
    
    // Insert before theme toggle or at the end
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && themeToggle.parentNode && themeToggle.parentNode.parentNode === navLinks) {
      navLinks.insertBefore(li, themeToggle.parentNode);
    } else {
      navLinks.appendChild(li);
    }

    const btn = document.getElementById('tgr-install-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerInstallationFlow();
      });
    }
  }

  function showInstallMenuOption(show = true) {
    const li = document.getElementById('tgr-install-li');
    if (li) {
      li.style.display = show ? '' : 'none';
    } else if (show) {
      injectInstallMenuOption(true);
    }
  }

  function triggerInstallationFlow() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showInstallMenuOption(false);
        }
        deferredPrompt = null;
      });
    } else if (isIOS) {
      showIOSInstallPrompt();
    } else {
      showGeneralInstallPrompt();
    }
  }

  function showIOSInstallPrompt() {
    let prompt = document.getElementById('tgr-ios-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'tgr-ios-prompt';
      prompt.className = 'tgr-install-prompt';
      
      prompt.innerHTML = `
        <div class="tgr-install-header">
          <div class="tgr-install-title-wrapper">
            <div class="tgr-install-app-icon">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="prompt-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" />
                    <stop offset="100%" stop-color="#7c6dfa" />
                  </linearGradient>
                </defs>
                <path d="M4 10 L16 3 L28 10 Z" fill="url(#prompt-logo-grad)" opacity="0.95" />
                <rect x="4" y="10" width="24" height="2" fill="url(#prompt-logo-grad)" />
                <rect x="6" y="14" width="3" height="12" rx="1" fill="url(#prompt-logo-grad)" opacity="0.8" />
                <rect x="23" y="14" width="3" height="12" rx="1" fill="url(#prompt-logo-grad)" opacity="0.8" />
                <path d="M16 13 V23 M11 18 H21" stroke="url(#prompt-logo-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="3" y="27" width="26" height="2" rx="0.5" fill="url(#prompt-logo-grad)" />
              </svg>
            </div>
            <div class="tgr-install-text">
              <h3>The Game Repository</h3>
              <p>Add to Home Screen for the full app experience</p>
            </div>
          </div>
          <button class="tgr-install-close" aria-label="Dismiss">&times;</button>
        </div>
        <div class="tgr-install-steps">
          <div class="tgr-install-step">
            <div class="tgr-install-step-num">1</div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">Tap the Share button <span class="tgr-install-step-icon"><svg viewBox="0 0 512 512" style="width:14px;height:14px;fill:currentColor;"><path d="M272 113v215c0 8.8-7.2 16-16 16s-16-7.2-16-16V113l-68.7 68.7c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l96-96c6.2-6.2 16.4-6.2 22.6 0l96 96c6.2 6.2 6.2 16.4 0 22.6s-16.4 6.2-22.6 0L272 113zm-208 87v224c0 17.7 14.3 32 32 32h320c17.7 0 32-14.3 32-32V200c0-17.7-14.3-32-32-32h-80v32h80v224H96V200h80v-32H96c-17.7 0-32 14.3-32 32z"/></svg></span> in Safari navigation.</div>
          </div>
          <div class="tgr-install-step">
            <div class="tgr-install-step-num">2</div>
            <div>Scroll down and select <strong style="color:var(--color-accent-2);">Add to Home Screen</strong> <span class="tgr-install-step-icon">+</span>.</div>
          </div>
        </div>
      `;
      document.body.appendChild(prompt);

      prompt.querySelector('.tgr-install-close').addEventListener('click', () => {
        prompt.classList.remove('is-visible');
        localStorage.setItem('tgr_ios_prompt_dismissed', 'true');
      });
    }

    // Dismiss any general prompt first
    const genPrompt = document.getElementById('tgr-general-prompt');
    if (genPrompt) genPrompt.classList.remove('is-visible');

    setTimeout(() => {
      prompt.classList.add('is-visible');
    }, 100);
  }

  function showGeneralInstallPrompt() {
    let prompt = document.getElementById('tgr-general-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'tgr-general-prompt';
      prompt.className = 'tgr-install-prompt';
      prompt.innerHTML = `
        <div class="tgr-install-header">
          <div class="tgr-install-title-wrapper">
            <div class="tgr-install-app-icon">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gen-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" />
                    <stop offset="100%" stop-color="#7c6dfa" />
                  </linearGradient>
                </defs>
                <path d="M4 10 L16 3 L28 10 Z" fill="url(#gen-logo-grad)" opacity="0.95" />
                <rect x="4" y="10" width="24" height="2" fill="url(#gen-logo-grad)" />
                <rect x="6" y="14" width="3" height="12" rx="1" fill="url(#gen-logo-grad)" opacity="0.8" />
                <rect x="23" y="14" width="3" height="12" rx="1" fill="url(#gen-logo-grad)" opacity="0.8" />
                <path d="M16 13 V23 M11 18 H21" stroke="url(#gen-logo-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="3" y="27" width="26" height="2" rx="0.5" fill="url(#gen-logo-grad)" />
              </svg>
            </div>
            <div class="tgr-install-text">
              <h3>The Game Repository</h3>
              <p>Install App on your device</p>
            </div>
          </div>
          <button class="tgr-install-close" aria-label="Dismiss">&times;</button>
        </div>
        <div class="tgr-install-steps">
          <div class="tgr-install-step">
            <div class="tgr-install-step-num">1</div>
            <div>Open your browser menu (usually three dots <span class="tgr-install-step-icon">⋮</span> or menu button).</div>
          </div>
          <div class="tgr-install-step">
            <div class="tgr-install-step-num">2</div>
            <div>Select <strong style="color:var(--color-accent-2);">Install app</strong> or <strong style="color:var(--color-accent-2);">Add to Home screen</strong>.</div>
          </div>
        </div>
      `;
      document.body.appendChild(prompt);

      prompt.querySelector('.tgr-install-close').addEventListener('click', () => {
        prompt.classList.remove('is-visible');
      });
    }

    // Dismiss any iOS prompt first
    const iosPrompt = document.getElementById('tgr-ios-prompt');
    if (iosPrompt) iosPrompt.classList.remove('is-visible');

    setTimeout(() => {
      prompt.classList.add('is-visible');
    }, 100);
  }

  /* ---------- Bootstrap ---------- */
  async function init() {
    /* Mark the original inline script that we have taken over live updates */
    window.TGR_API_HANDLED = true;

    injectNavControls();
    refreshNavForUser(getUser());
    initPWAInstallation();

    if (getToken()) {
      try {
        const { user } = await api('/api/auth/me');
        setUser(user);
        refreshNavForUser(user);
      } catch (e) {
        setToken(null);
        setUser(null);
        refreshNavForUser(null);
      }
    }

    /* Prefetch in parallel so the modal opens with full data on first click */
    await Promise.all([
      loadSiteSettings(),
      loadLivePlayerCounts(),
      prefetchStreamingConfigs(),
      prefetchQueueSettings(),
      loadReviews(),
      startNotificationTicker()
    ]);

    attachStreamingConfig();
    attachCardNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
