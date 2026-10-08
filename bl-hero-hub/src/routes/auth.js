'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db');
const { esc, flash, limited, hit, DUMMY_HASH } = require('../utils');
const { page, csrf } = require('../layout');

const form = (req, kind, err = '') => page(req, kind, `<div class="panel narrow"><h1>${kind}</h1><img class="divider" src="/img/divider.svg" alt="">
${err ? `<p class="note err">${esc(err)}</p>` : ''}
<form method="post">${csrf(req)}
<label>ชื่อผู้ใช้ <small>(a-z 0-9 _ ยาว 3-20 ตัว)</small></label><input name="username" required maxlength="20" autocomplete="username">
<label>รหัสผ่าน <small>(8-72 ตัวอักษร)</small></label><input name="password" type="password" required minlength="8" maxlength="72" autocomplete="${kind === 'สมัครสมาชิก' ? 'new-password' : 'current-password'}">
<div class="row"><button>${kind}</button></div></form></div>`);

router.get('/register', (req, res) => res.send(form(req, 'สมัครสมาชิก')));
router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim(), password = String(req.body.password || '');
  if (limited('reg|' + req.ip, 10)) return res.status(429).send(form(req, 'สมัครสมาชิก', 'ลองบ่อยเกินไป กรุณารอสักครู่'));
  hit('reg|' + req.ip);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).send(form(req, 'สมัครสมาชิก', 'ชื่อผู้ใช้ไม่ถูกต้อง'));
  if (password.length < 8 || password.length > 72) return res.status(400).send(form(req, 'สมัครสมาชิก', 'รหัสผ่านต้องยาว 8-72 ตัวอักษร'));
  const hash = await bcrypt.hash(password, 12); // bcrypt + salt ในตัว
  try { db.prepare("INSERT INTO users(username,hash,role) VALUES(?,?, 'user')").run(username, hash); }
  catch { return res.status(400).send(form(req, 'สมัครสมาชิก', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว')); }
  flash(req, 'สมัครสมาชิกสำเร็จ เข้าสู่ระบบได้เลย', 'add'); res.redirect('/login');
});

router.get('/login', (req, res) => res.send(form(req, 'เข้าสู่ระบบ')));
router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim().slice(0, 20), password = String(req.body.password || '').slice(0, 72);
  const key = 'login|' + req.ip + '|' + username.toLowerCase();
  if (limited(key, 5)) return res.status(429).send(form(req, 'เข้าสู่ระบบ', 'ล็อกอินผิดหลายครั้ง กรุณารอ 15 นาที'));
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  const ok = await bcrypt.compare(password, u ? u.hash : DUMMY_HASH); // เวลาใกล้เคียงกันแม้ไม่พบผู้ใช้
  if (!u || !ok) { hit(key); return res.status(401).send(form(req, 'เข้าสู่ระบบ', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')); }
  req.session.regenerate(err => { // กัน session fixation
    if (err) throw err;
    req.session.uid = u.id; req.session.csrf = crypto.randomBytes(24).toString('hex');
    flash(req, 'ยินดีต้อนรับ ' + u.username, 'add'); res.redirect('/');
  });
});
router.post('/logout', (req, res) => req.session.destroy(() => res.clearCookie('sid').redirect('/')));

module.exports = router;
