'use strict';
// อัปโหลดรูปอย่างปลอดภัย: จำกัดขนาด, ตรวจ magic bytes จริง, สุ่มชื่อไฟล์เอง
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOAD_DIR, MAX_IMG } = require('./config');
const { flash } = require('./utils');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const m = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMG, files: 1, fields: 10, fieldSize: 4000 } });

function detect(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return '.webp';
  return null;
}
function saveImage(file) {
  if (!file) return null;
  const ext = detect(file.buffer);
  if (!ext) throw new Error('BAD_IMAGE');
  const name = crypto.randomBytes(16).toString('hex') + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer, { flag: 'wx' });
  return name;
}
function removeImage(name) {
  if (!name || !/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) return;
  fs.unlink(path.join(UPLOAD_DIR, name), () => {});
}
// ต้องวางก่อน CSRF check เพราะฟอร์ม multipart ต้อง parse ก่อนจึงจะอ่าน _csrf ได้
function parseUpload(req, res, next) {
  m.single('image')(req, res, err => {
    if (!err) return next();
    flash(req, err.code === 'LIMIT_FILE_SIZE' ? 'รูปใหญ่เกิน 2MB' : 'อัปโหลดรูปไม่สำเร็จ', 'err');
    res.redirect(req.path.endsWith('/edit') ? req.path : '/heroes/new');
  });
}
module.exports = { parseUpload, saveImage, removeImage };
