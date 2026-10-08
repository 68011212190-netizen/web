'use strict';
const bcrypt = require('bcryptjs');
const esc = s => String(s ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const toId = v => (/^\d{1,9}$/.test(String(v)) ? parseInt(v, 10) : null);
const flash = (req, msg, type = 'ok') => { req.session.flash = { type, msg }; };

// จำกัดจำนวนครั้ง (กัน brute force) — เก็บในหน่วยความจำ
const attempts = new Map();
const limited = (key, max) => { const now = Date.now(); const a = (attempts.get(key) || []).filter(t => now - t < 900000); attempts.set(key, a); return a.length >= max; };
const hit = key => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

module.exports = { esc, stars, toId, flash, limited, hit, DUMMY_HASH };
