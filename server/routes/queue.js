const express = require('express');
const QueueSetting = require('../models/QueueSetting');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await QueueSetting.find().populate('game', 'title');
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/by-game/:gameId', async (req, res, next) => {
  try {
    const item = await QueueSetting.findOne({ game: req.params.gameId });
    res.json({ item: item || null });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { game, position, estimatedWait, onlineNow } = req.body;
    const item = await QueueSetting.findOneAndUpdate(
      { game },
      { position, estimatedWait, onlineNow, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const item = await QueueSetting.findByIdAndUpdate(
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
    await QueueSetting.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
