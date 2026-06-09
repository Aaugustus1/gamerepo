# The Game Repository — MERN Prototype

Static digital-preservation site converted to a MERN stack app. Vanilla HTML/CSS/JS frontend, Node + Express + MongoDB backend, JWT auth, admin panel.

## What changed vs the static version

- `index.html` now has `<script src="api.js" defer>` and `<link rel="stylesheet" href="styles.css">` (inline styles extracted)
- CSS extracted from inline `<style>` blocks into `styles.css` (~1,600 lines)
- **Game detail page**: Clicking cards in the "Premium Cloud Library" section navigates to `game.html?id=<slug>`
- The detail page works **with or without** the API server — it has fallback data for premium games

The project files are:

```
.
├── index.html              ← main landing page (external CSS + inline JS)
├── styles.css              ← extracted CSS design system (~1,600 lines)
├── api.js                  ← frontend API integration + card navigation
├── game.html               ← game detail page (with full modal set)
├── game-detail.js          ← detail page logic + fallback data
├── admin.html              ← admin panel (own inline styles)
├── admin.js                ← admin panel logic
├── profile.html            ← user profile page (own inline styles)
├── profile.js              ← profile page logic
├── images/                 ← 22 game cover images
├── server/                 ← Express + Mongoose backend
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   ├── .env.example
│   ├── models/             ← 8 Mongoose schemas
│   ├── routes/             ← 10 Express routers
│   ├── middleware/         ← JWT auth + admin guard
│   └── uploads/            ← user-uploaded files
├── deploy.sh               ← VPS deploy script
├── nginx.conf.example      ← nginx reverse-proxy config
└── ecosystem.config.cjs    ← PM2 process definition
```

## Local development

### 1. Install + start MongoDB

You need MongoDB running locally on port 27017.

- Windows: install [MongoDB Community](https://www.mongodb.com/try/download/community) and run `mongod`.
- macOS: `brew install mongodb-community && brew services start mongodb-community`
- Linux: install via your package manager, then `sudo systemctl start mongod`

### 2. Backend

```bash
cd server
cp .env.example .env       # edit values if needed
npm install
node seed.js               # populates 22 games, queue, streaming, trending, etc.
npm run dev                # starts on http://localhost:5000
```

The seed script clears and re-inserts all collections, so it's safe to re-run.

### 3. Frontend

The frontend is plain static files. Open `index.html` directly in a browser, **or** for full API access (so login / uploads / live counts work) serve the project root with any static server:

```bash
# From the project root (one level above server/)
npx http-server -p 8080 -c-1
# or
python -m http.server 8080
```

Then visit `http://localhost:8080`.

> The `api.js` shim auto-detects `localhost` / `127.0.0.1` and points at `http://localhost:5000`. For other hosts it falls back to `<protocol>//<host>:5000`.

### 4. First admin

Register any account. **The first registered user automatically becomes admin** (controlled by `ADMIN_BOOTSTRAP=true` in `.env`). After that, registration creates normal `user` accounts. Admins can promote others from the Users panel.

## API

All endpoints are under `/api/*`. Most mutating endpoints require a Bearer token:

```
Authorization: Bearer <jwt from /api/auth/login>
```

| Path | Methods | Auth |
| --- | --- | --- |
| `/api/auth/register` | POST | – |
| `/api/auth/login` | POST | – |
| `/api/auth/me` | GET | user |
| `/api/users` | GET | admin |
| `/api/users/me` | PUT | user |
| `/api/users/:id/role` | PUT | admin |
| `/api/users/:id` | DELETE | admin |
| `/api/games` | GET, POST | GET: – · POST: admin |
| `/api/games/:id` | GET, PUT, DELETE | GET: – · rest: admin |
| `/api/reviews` | GET | – |
| `/api/reviews/all` | GET | admin |
| `/api/reviews` | POST | admin |
| `/api/reviews/:id` | PUT, DELETE | admin |
| `/api/queue` | GET, POST | POST: admin |
| `/api/queue/by-game/:gameId` | GET | – |
| `/api/queue/:id` | PUT, DELETE | admin |
| `/api/streaming` | GET, POST | POST: admin |
| `/api/streaming/by-game/:gameId` | GET | – |
| `/api/streaming/:id` | PUT, DELETE | admin |
| `/api/trending` | GET, PUT | PUT: admin |
| `/api/notifications` | GET, PUT | PUT: admin |
| `/api/site` | GET, PUT | PUT: admin |
| `/api/upload/image` | POST (multipart) | user |
| `/uploads/:filename` | GET (static) | – |
| `/api/health` | GET | – |

## Deployment (Contabo Ubuntu 22.04)

```bash
# 1. On a fresh VPS
sudo apt update && sudo apt install -y nginx mongodb-org nodejs npm certbot python3-certbot-nginx
sudo systemctl enable --now nginx mongod

# 2. Clone your repo
sudo mkdir -p /var/www && sudo chown $USER /var/www
cd /var/www
git clone <your-repo-url> gamenull
cd gamenull

# 3. Install + seed
cd server
cp .env.example .env
# (edit .env to set a strong JWT_SECRET)
nano .env
npm install --omit=dev
node seed.js
cd ..

# 4. PM2
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | sudo bash

# 5. Nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/gamenull
# edit: replace yourdomain.com + root path if not /var/www/gamenull
sudo nano /etc/nginx/sites-available/gamenull
sudo ln -s /etc/nginx/sites-available/gamenull /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 7. Firewall
sudo ufw allow 22,80,443/tcp
sudo ufw enable

# Future deploys:
./deploy.sh
```

## Game Detail Page

Clicking any card in the **Premium Cloud Library** section on `index.html` navigates to `game.html?id=<slug>`. The detail page:

- Tries to fetch game data from the API (`/api/games/:id`)
- Falls back to hardcoded data for the two premium games if the API is offline
- Shows cover image, title, publisher, rating, description, catalog code, genres, cloud status, and player count
- Has a working **Play Now** button that opens the streaming modal (same flow as index.html)
- Supports Wishlist and Share actions

### How card navigation works (offline-first)

1. `api.js` stamps a `data-game-id` slug on premium cards immediately (derived from the card title)
2. If the API IS running, `loadLivePlayerCounts()` overwrites the slug with the real MongoDB `_id`
3. A delegated click handler on the document navigates to `game.html?id=<slug-or-id>`
4. `game-detail.js` first tries the API, then falls back to `FALLBACK_GAMES` for known slugs

## Testing without MongoDB

You can verify the detail page works without any server:

```bash
# Just open directly in the browser:
start index.html
# Click any premium card → game.html should load with fallback data

# Or run a quick static server:
npx http-server -p 8080 -c-1
# Visit http://localhost:8080
```

## Notes

- All streaming / queue / GPU / online-count data is **fake** — purely stored in the DB and displayed, no real streaming.
- The existing `index.html` game cards are still hardcoded in the markup; the API shim *overrides* the live player count display with values from `/api/games`, and replaces the GPU options inside the "Configure Streaming Session" modal with values from `/api/streaming/by-game/:id`.
- `siteSettings` (hero text, how-it-works, footer) is read by `api.js` on page load and applied to the existing hero block. Editing it from the admin panel updates the live homepage immediately for all visitors on next reload.
- Default accent is **purple** (`#7c6dfa`, `#a855f7`) to match the original site's actual theme, not `#CAFF00` yellow.
- `admin.html` and `profile.html` have their own inline styles — do NOT replace them with `styles.css`.
