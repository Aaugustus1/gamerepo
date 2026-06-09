const express = require('express');
const SiteSetting = require('../models/SiteSetting');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getSingleton() {
  let cfg = await SiteSetting.findOne();
  if (!cfg) cfg = await SiteSetting.create({});
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
    const allowed = [
      'heroEyebrow',
      'heroHeadline',
      'heroHeadlineEm',
      'heroSubheadline',
      'howItWorksTitle',
      'howItWorksSteps',
      'compatibilityTitle',
      'compatibilityDevices',
      'footerColumns'
    ];
    const cfg = await getSingleton();
    for (const key of allowed) {
      if (req.body[key] !== undefined) cfg[key] = req.body[key];
    }
    cfg.updatedAt = new Date();
    await cfg.save();
    res.json({ config: cfg });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
