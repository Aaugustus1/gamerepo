const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_PATH || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = file.originalname
      .replace(/[^a-z0-9_.-]/gi, '_')
      .slice(0, 32);
    cb(null, `${Date.now()}_${safe}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    const ok = /image\/(jpeg|jpg|png|gif|webp|avif|svg\+xml)/i.test(
      file.mimetype
    );
    cb(ok ? null : new Error('Only image files allowed'), ok);
  }
});

router.post('/image', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const urlPath = `/uploads/${req.file.filename}`;
  res.json({
    path: urlPath,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

module.exports = router;
