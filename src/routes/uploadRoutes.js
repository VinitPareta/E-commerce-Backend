const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// On Vercel (read-only FS) we MUST write to /tmp. Note: files in /tmp are
// ephemeral on serverless and may disappear between cold starts. For real
// production use a CDN like Cloudinary / S3. The admin form also supports
// pasting an image URL which is the recommended path on Vercel.
const isServerless = !!process.env.VERCEL;
const uploadDir = isServerless
  ? '/tmp/ds-uploads'
  : path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ok = allowed.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Serve uploaded files (only meaningful in local dev; on Vercel /tmp can't
// reliably be served back). Expose under /api/upload/file/:name.
router.get('/file/:name', (req, res) => {
  const filename = path.basename(req.params.name);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.sendFile(filePath);
});

// @route POST /api/upload
// @desc  Upload single product image (admin)
router.post('/', protect, admin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const url = isServerless
    ? `/api/upload/file/${req.file.filename}`
    : `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url,
    note: isServerless
      ? 'On Vercel uploads are ephemeral. For permanent images, paste an image URL instead.'
      : undefined,
  });
});

// @route POST /api/upload/multiple
// @desc  Upload multiple product images (admin)
router.post(
  '/multiple',
  protect,
  admin,
  upload.array('images', 6),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map((f) =>
      isServerless ? `/api/upload/file/${f.filename}` : `/uploads/${f.filename}`
    );
    res.json({ success: true, urls });
  }
);

module.exports = router;
