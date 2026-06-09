const express = require('express');
const Notification = require('../models/Notification');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getSingleton() {
  let cfg = await Notification.findOne();
  if (!cfg) cfg = await Notification.create({});
  return cfg;
}

router.get('/', async (req, res, next) => {
  try {
    const cfg = await getSingleton();
    res.json({ config: cfg });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { enabled, intervalSeconds, usernamePool } = req.body;
    const cfg = await getSingleton();
    if (typeof enabled === 'boolean') cfg.enabled = enabled;
    if (typeof intervalSeconds === 'number') cfg.intervalSeconds = intervalSeconds;
    if (Array.isArray(usernamePool)) cfg.usernamePool = usernamePool;
    cfg.updatedAt = new Date();
    await cfg.save();
    res.json({ config: cfg });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
