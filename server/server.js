require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const reviewRoutes = require('./routes/reviews');
const queueRoutes = require('./routes/queue');
const streamingRoutes = require('./routes/streaming');
const trendingRoutes = require('./routes/trending');
const notificationRoutes = require('./routes/notifications');
const siteRoutes = require('./routes/site');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/uploads', express.static(path.resolve(UPLOAD_PATH)));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'game-repository-api',
    time: new Date().toISOString(),
    db: mongoose.connection.readyState
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/streaming', streamingRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[mongo] connected');
    app.listen(PORT, () => {
      console.log(`[api] listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[startup failed]', err.message);
    process.exit(1);
  }
}

start();
