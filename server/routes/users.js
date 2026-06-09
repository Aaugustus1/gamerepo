const express = require('express');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map(u => u.toPublic()) });
  } catch (err) {
    next(err);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, tag, pfpPath } = req.body || {};
    const update = {};
    if (name) update.name = name;
    if (tag) update.tag = tag.replace(/^@/, '').toLowerCase();
    if (pfpPath !== undefined) update.pfpPath = pfpPath;
    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true
    });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
