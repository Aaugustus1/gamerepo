const express = require('express');
const TrendingConfig = require('../models/TrendingConfig');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getSingleton() {
  let cfg = await TrendingConfig.findOne();
  if (!cfg) {
    cfg = await TrendingConfig.create({ items: [] });
  }
  return cfg;
}

router.get('/', async (req, res, next) => {
  try {
    const cfg = await getSingleton();
    await cfg.populate('items.game', 'title coverImage icon starRating');
    res.json({ config: cfg });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { items, title, enabled } = req.body;
    const cfg = await getSingleton();
    if (Array.isArray(items)) cfg.items = items;
    if (typeof title === 'string') cfg.title = title;
    if (typeof enabled === 'boolean') cfg.enabled = enabled;
    cfg.updatedAt = new Date();
    await cfg.save();
    res.json({ config: cfg });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
