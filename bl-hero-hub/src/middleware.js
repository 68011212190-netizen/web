'use strict';
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const { PROD, UPLOAD_DIR } = require('./config');
const { db } = require('./db');
const { fail } = require('./layout');
const { flash } = require('./utils');

function base(app) {
  app.disable('x-powered-by');
  if (PROD) app.set('trust proxy', 1);
  app.use(helmet());
  // ไฟล์ static ต้องอยู่ก่อน session เพื่อไม่ให้สร้าง session ให้ทุกรูป
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: PROD ? '1d' : 0 }));
  app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', maxAge: '7d' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(session({
    name: 'sid', secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 2 * 3600 * 1000 }
  }));
  app.use((req, res, next) => { // โหลดผู้ใช้จาก DB ทุกครั้ง (บทบาทเปลี่ยนมีผลทันที)
    req.user = req.session.uid ? db.prepare('SELECT id,username,role FROM users WHERE id=?').get(req.session.uid) : null;
    if (!req.user) delete req.session.uid;
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    next();
  });
}
function csrfCheck(req, res, next) {
  if (req.method === 'POST') {
    const a = Buffer.from(String((req.body && req.body._csrf) || '')), b = Buffer.from(req.session.csrf);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(req, res, 403, 'CSRF token ไม่ถูกต้อง');
  }
  next();
}
const need = (req, res, next) => (req.user ? next() : (flash(req, 'กรุณาเข้าสู่ระบบก่อน', 'err'), res.redirect('/login')));
const adminOnly = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : fail(req, res, 403, 'เฉพาะผู้ดูแลระบบ'));

module.exports = { base, csrfCheck, need, adminOnly };
