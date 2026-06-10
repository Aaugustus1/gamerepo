/* ============================================================
    game-detail.js — Game detail page logic
    - Reads ?id= from URL
    - Fetches /api/games/:id
    - Populates the detail page
    - Wires up Play, Wishlist, Share
    - 404 / network error fallback
   ============================================================ */

(function () {
  'use strict';

  const IS_LOCALHOST = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  const API_BASE =
    (window.TGR_API && window.TGR_API.base) ||
    (IS_LOCALHOST ? 'http://localhost:5000' : null);

  const STORAGE_KEY = 'tgr_wishlist';

  /* ---------- Slug helper (must match api.js titleToSlug) ---------- */
  function titleToSlug(title) {
    return String(title || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /* ---------- Fallback game data (works without API/MongoDB) ---------- */
  const FALLBACK_GAMES = {
    'lego-batman-legacy-of-the-dark-knight': {
      title: 'LEGO Batman: Legacy of The Dark Knight',
      publisher: 'TT GAMES / WB',
      coverImage: 'images/Lego Batman Legacy of The Dark Knight.avif',
      icon: '🦇',
      isNewBadge: true,
      starRating: 4.3,
      ratingCount: 6780,
      catalogCode: '#MM-2026-LBL',
      genres: ['Action-Adventure', 'LEGO', 'Superhero'],
      cloudReady: true,
      playersOnline: 3241,
      streamUrl: 'https://steamrip.com/lego-batman-legacy-of-the-dark-knight-free-download/',
      description: 'Suit up as The Dark Knight in this LEGO reimagining of the Batman universe. Battle iconic villains across Gotham City, solve puzzles, and unlock a massive roster of DC characters. Features drop-in co-op, open-world exploration, and the signature LEGO humor fans love.',
      screenshots: []
    },
    'tomodachi-life-living-the-dream': {
      title: 'Tomodachi Life: Living the Dream',
      publisher: 'NINTENDO',
      coverImage: 'images/tomodachi life living the dream.jpg',
      icon: '🏝️',
      isNewBadge: false,
      starRating: 4.8,
      ratingCount: 12402,
      catalogCode: '#MM-2013-TML',
      genres: ['Life Simulation', 'Social', 'Humor'],
      cloudReady: true,
      playersOnline: 2187,
      streamUrl: 'https://gofile.io/d/8TtjPR',
      description: 'Create Mii characters and watch them live out bizarre, hilarious lives on a virtual island. Tomodachi Life blends life simulation with absurdist comedy — your Miis develop relationships, pursue dreams, and get into wonderfully weird situations. A unique Nintendo classic preserved for cloud streaming.',
      screenshots: []
    },
    'paralives': {
      title: 'Paralives',
      publisher: 'PARALIVES STUDIO',
      coverImage: 'images/paralives box art.webp',
      icon: '🏠',
      isNewBadge: true,
      starRating: 4.6,
      ratingCount: 2314,
      catalogCode: '#MM-2025-PAR',
      genres: ['Simulation', 'Indie', 'Life Sim'],
      cloudReady: true,
      playersOnline: 1456,
      streamUrl: 'https://store.steampowered.com/app/1118520/Paralives/',
      description: 'Paralives is an upcoming life simulation game. Build your dream house, create some characters and manage their lives inside their homes and all around an open world town! Customize everything with easy-to-use, powerful building tools, a color wheel, and direct editing options.',
      screenshots: [
        'images/paralives_ss0.jpg',
        'images/paralives_ss1.jpg',
        'images/paralives_ss2.jpg',
        'images/paralives_ss3.jpg',
        'images/paralives_ss4.jpg'
      ]
    }
  };

  /* ---------- DOM refs ---------- */
  const els = {
    loading: document.getElementById('detail-loading'),
    error: document.getElementById('detail-error'),
    content: document.getElementById('detail-content'),
    cover: document.getElementById('detail-cover'),
    coverIcon: document.getElementById('detail-cover-icon'),
    badgeNew: document.getElementById('detail-badge-new'),
    title: document.getElementById('detail-title'),
    publisherName: document.getElementById('detail-publisher-name'),
    stars: document.getElementById('detail-stars'),
    ratingValue: document.getElementById('detail-rating-value'),
    ratingCount: document.getElementById('detail-rating-count'),
    catalog: document.getElementById('detail-catalog'),
    genres: document.getElementById('detail-genres'),
    cloud: document.getElementById('detail-cloud'),
    players: document.getElementById('detail-players'),
    playBtn: document.getElementById('detail-play-btn'),
    wishlistBtn: document.getElementById('detail-wishlist-btn'),
    shareBtn: document.getElementById('detail-share-btn'),
    description: document.getElementById('detail-description-text'),
    screenshotsSection: document.getElementById('detail-screenshots-section'),
    screenshotsGrid: document.getElementById('detail-screenshots-grid'),
    pageTitle: document.getElementById('page-title'),
    athCover: document.getElementById('ath-cover-img'),
    athHomePrev: document.getElementById('ath-home-icon-preview'),
    athGameName: document.getElementById('ath-game-name'),
    athHomeLabel: document.getElementById('ath-home-label-preview'),
    athIconEl: document.getElementById('ath-icon'),
    athAppTitle: document.getElementById('ath-app-title')
  };

  let currentGame = null;

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(empty);
  }

  function showError() {
    els.loading.hidden = true;
    els.content.hidden = true;
    els.error.hidden = false;
  }

  function showContent() {
    els.loading.hidden = true;
    els.error.hidden = true;
    els.content.hidden = false;
  }

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveWishlist(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function applyWishlistState(isWishlisted) {
    if (isWishlisted) {
      els.wishlistBtn.classList.add('is-wishlisted');
      els.wishlistBtn.innerHTML = '♥ Wishlisted';
    } else {
      els.wishlistBtn.classList.remove('is-wishlisted');
      els.wishlistBtn.innerHTML = '♡ Wishlist';
    }
  }

  function showToast(icon, message) {
    let toast = document.getElementById('tgr-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tgr-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '';
    const iEl = document.createElement('span'); iEl.textContent = icon;
    const mEl = document.createElement('span'); mEl.innerHTML = message;
    toast.appendChild(iEl);
    toast.appendChild(mEl);
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ---------- Populate ---------- */
  function populate(game) {
    currentGame = game;

    /* Title (page + heading) */
    if (game.title) {
      els.pageTitle.textContent = `${game.title} — The Game Repository`;
      document.title = els.pageTitle.textContent;
      els.title.textContent = game.title;

      /* --- iOS ATH: set app title meta & modal labels --- */
      if (els.athAppTitle) els.athAppTitle.content = game.title;
      if (els.athGameName) els.athGameName.textContent = game.title;
      /* Truncate to ~14 chars for the home screen icon label */
      const shortName = game.title.length > 14 ? game.title.substring(0, 13).trim() + '…' : game.title;
      if (els.athHomeLabel) els.athHomeLabel.textContent = shortName;
    }

    /* Cover image */
    if (game.coverImage) {
      els.cover.style.backgroundImage = `url('${escapeHtml(game.coverImage)}')`;

      /* --- iOS ATH: set apple-touch-icon dynamically --- */
      const absUrl = new URL(game.coverImage, location.href).href;
      if (els.athIconEl) {
        els.athIconEl.href = absUrl;
      }
      /* Also set via JS for browsers that read it at runtime */
      let dynIcon = document.getElementById('ath-dynamic-icon');
      if (!dynIcon) {
        dynIcon = document.createElement('link');
        dynIcon.rel = 'apple-touch-icon';
        dynIcon.id = 'ath-dynamic-icon';
        document.head.appendChild(dynIcon);
      }
      dynIcon.href = absUrl;

      /* Update ATH modal previews */
      if (els.athCover) els.athCover.style.backgroundImage = `url('${escapeHtml(game.coverImage)}')`;
      if (els.athHomePrev) els.athHomePrev.style.backgroundImage = `url('${escapeHtml(game.coverImage)}')`;
    }
    if (game.icon) {
      els.coverIcon.textContent = game.icon;
    }

    /* NEW badge */
    els.badgeNew.hidden = !game.isNewBadge;

    /* Publisher */
    els.publisherName.textContent = game.publisher || 'THE GAME REPOSITORY';

    /* Rating */
    const rating = typeof game.starRating === 'number' ? game.starRating : 4.5;
    const ratingCount = typeof game.ratingCount === 'number' ? game.ratingCount : 0;
    els.stars.textContent = renderStars(rating);
    els.stars.style.color = '#a855f7';
    els.ratingValue.textContent = rating.toFixed(1);
    els.ratingCount.textContent = ratingCount.toLocaleString();

    /* Meta */
    els.catalog.textContent = game.catalogCode || '—';
    els.genres.textContent = (game.genres && game.genres.length)
      ? game.genres.join(', ')
      : '—';
    els.cloud.textContent = game.cloudReady !== false
      ? '☁️ Cloud Ready'
      : '⏳ Coming soon';
    els.cloud.style.color = game.cloudReady !== false ? '#42f5a1' : 'var(--color-muted)';
    els.players.textContent = (typeof game.playersOnline === 'number')
      ? `${game.playersOnline.toLocaleString()} online`
      : '—';

    /* Description */
    if (game.description && game.description.trim()) {
      els.description.textContent = game.description;
    } else {
      els.description.textContent = 'No description available for this title yet.';
    }

    /* Screenshots */
    if (Array.isArray(game.screenshots) && game.screenshots.length) {
      els.screenshotsSection.hidden = false;
      els.screenshotsGrid.innerHTML = game.screenshots.map(s =>
        `<div class="screenshot" style="background-image:url('${escapeHtml(s)}')"></div>`
      ).join('');
    } else {
      els.screenshotsSection.hidden = true;
    }

    /* Play button - set data-link and data-title so api.js streaming flow works */
    if (els.playBtn) {
      els.playBtn.setAttribute('data-link', game.streamUrl || '#');
      els.playBtn.setAttribute('data-title', game.title || '');
      els.playBtn.setAttribute('aria-label', `Play Now — ${game.title || 'this game'}`);
    }

    /* Wishlist state */
    const list = getWishlist();
    applyWishlistState(list.includes(game.title));

    showContent();
  }

  /* ---------- Try fallback data ---------- */
  function tryFallback(id) {
    /* Direct slug match */
    if (FALLBACK_GAMES[id]) {
      populate(FALLBACK_GAMES[id]);
      return true;
    }
    /* Also check if the id is a MongoDB ObjectId that we don't have -
        in that case, no fallback is possible */
    if (/^[0-9a-f]{24}$/i.test(id)) {
      return false;
    }
    /* Try fuzzy slug match (strip trailing numbers, etc.) */
    for (const [slug, game] of Object.entries(FALLBACK_GAMES)) {
      if (id.includes(slug) || slug.includes(id)) {
        populate(game);
        return true;
      }
    }
    return false;
  }

  /* ---------- Fetch ---------- */
  async function fetchGame(id) {
    // No API available (non-localhost) — go straight to fallback
    if (!API_BASE) {
      if (!tryFallback(id)) showError();
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const res = await fetch(`${API_BASE}/api/games/${encodeURIComponent(id)}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.status === 404) {
        if (!tryFallback(id)) showError();
        return;
      }
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = await res.json();
      if (!data || !data.game) {
        if (!tryFallback(id)) showError();
        return;
      }
      populate(data.game);
    } catch (err) {
      clearTimeout(timeout);
      console.warn('[game-detail] API unavailable, using fallback data:', err.message);
      if (!tryFallback(id)) showError();
    }
  }

  /* ---------- Wire up actions ---------- */
  function wireActions() {
    if (els.wishlistBtn) {
      els.wishlistBtn.addEventListener('click', function () {
        if (!currentGame || !currentGame.title) return;
        const title = currentGame.title;
        let list = getWishlist();
        const idx = list.indexOf(title);
        const adding = idx === -1;
        if (adding) {
          list.push(title);
          showToast('♥', `Added <strong>${escapeHtml(title)}</strong> to your wishlist`);
        } else {
          list.splice(idx, 1);
          showToast('♡', `Removed from wishlist`);
        }
        saveWishlist(list);
        applyWishlistState(adding);
        els.wishlistBtn.style.transform = 'scale(1.12)';
        setTimeout(() => els.wishlistBtn.style.transform = '', 180);
      });
    }

    if (els.shareBtn) {
      els.shareBtn.addEventListener('click', function () {
        const shareUrl = window.location.href.split('#')[0];

        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl)
            .then(() => showToast('📋', 'Link copied to clipboard!'))
            .catch(() => showToast('🔗', 'Copy the URL from your address bar'));
        } else {
          showToast('🔗', 'Copy the URL from your address bar');
        }
      });
    }
  }

  /* ---------- Init ---------- */
  function init() {
    wireActions();
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) {
      showError();
      return;
    }
    fetchGame(id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();