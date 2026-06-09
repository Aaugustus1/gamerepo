const express = require('express');
const StreamingConfig = require('../models/StreamingConfig');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await StreamingConfig.find().populate('game', 'title');
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/by-game/:gameId', async (req, res, next) => {
  try {
    const item = await StreamingConfig.findOne({ game: req.params.gameId });
    res.json({ item: item || null });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { game, gpuOptions, qualityOptions, frameRateOptions } = req.body;
    const item = await StreamingConfig.findOneAndUpdate(
      { game },
      { gpuOptions, qualityOptions, frameRateOptions, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const item = await StreamingConfig.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await StreamingConfig.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
