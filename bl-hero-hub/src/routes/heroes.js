'use strict';
const router = require('express').Router();
const { db } = require('../db');
const { esc, stars, toId, flash } = require('../utils');
const { page, csrf, fail } = require('../layout');
const { need } = require('../middleware');
const { saveImage, removeImage } = require('../upload');

const img = (h, zoom) => h.image
  ? `<img src="/uploads/${esc(h.image)}" alt="${esc(h.name)}" loading="lazy" ${zoom ? 'data-zoom' : ''}>`
  : '<div class="noimg"></div>';
const card = (h, i) => `<article class="card pop" style="--i:${i}"><a class="thumb" href="/heroes/${h.id}">${img(h)}</a>
<div class="card-b"><h3><a href="/heroes/${h.id}">${esc(h.name)}</a></h3>
<div class="muted">${esc(h.series)}${h.actor ? ' · ' + esc(h.actor) : ''}</div><div class="stars">${stars(h.rating)}</div>
<div class="muted small">โดย ${esc(h.username)}</div></div></article>`;

// ----- หน้าแรก + ค้นหา -----
router.get('/', (req, res) => {
  const q = String(req.query.q || '').slice(0, 50);
  const rows = db.prepare(`SELECT h.*,u.username FROM heroes h JOIN users u ON u.id=h.user_id
    WHERE h.name LIKE ? OR h.series LIKE ? OR h.actor LIKE ? ORDER BY h.id DESC LIMIT 100`).all(...Array(3).fill('%' + q + '%'));
  res.send(page(req, 'ทำเนียบพระเอก', `<section class="banner"><p class="kicker">ตำนานรักต้องห้าม · เทพบุตรแห่งจอแก้ว</p>
<h1>ทำเนียบพระเอกซีรีส์วาย</h1><img class="divider" src="/img/divider.svg" alt="">
<form method="get" class="search"><input name="q" value="${esc(q)}" placeholder="ค้นหาชื่อพระเอก / ซีรีส์ / นักแสดง"><button>ค้นหา</button></form></section>
<div class="grid">${rows.map(card).join('') || '<p class="muted center">ยังไม่มีพระเอกในทำเนียบ… เป็นผู้จารึกนามคนแรกสิ!</p>'}</div>`));
});

// ----- ฟอร์มที่ 1: เพิ่ม/แก้ไขพระเอก (มีรูป) -----
function readHero(b) {
  const h = { name: String(b.name || '').trim(), series: String(b.series || '').trim(), actor: String(b.actor || '').trim(),
    rating: parseInt(b.rating, 10), review: String(b.review || '').trim() };
  let err = '';
  if (!h.name || h.name.length > 80) err = 'ชื่อพระเอกต้อง 1-80 ตัวอักษร';
  else if (!h.series || h.series.length > 80) err = 'ชื่อซีรีส์ต้อง 1-80 ตัวอักษร';
  else if (h.actor.length > 80) err = 'ชื่อนักแสดงยาวเกินไป';
  else if (!(h.rating >= 1 && h.rating <= 5)) err = 'คะแนนต้อง 1-5';
  else if (h.review.length > 1000) err = 'รีวิวยาวเกิน 1000 ตัวอักษร';
  return { h, err };
}
const heroForm = (req, h, action, title, err = '') => page(req, title, `<div class="panel narrow"><h1>${title}</h1><img class="divider" src="/img/divider.svg" alt="">
${err ? `<p class="note err">${esc(err)}</p>` : ''}
<form method="post" action="${action}" enctype="multipart/form-data" data-fx="add">${csrf(req)}
<label>ชื่อพระเอก / ตัวละคร</label><input name="name" required maxlength="80" value="${esc(h.name)}">
<label>ชื่อซีรีส์</label><input name="series" required maxlength="80" value="${esc(h.series)}">
<label>นักแสดง</label><input name="actor" maxlength="80" value="${esc(h.actor)}">
<label>ภาพซีรีส์ / ภาพพระเอก <small>(JPG, PNG, WEBP ไม่เกิน 2MB)</small></label>
<div class="upload"><div id="preview">${h.image ? `<img src="/uploads/${esc(h.image)}" alt="">` : '<span>ยังไม่เลือกรูป</span>'}</div>
<input type="file" id="image" name="image" accept="image/jpeg,image/png,image/webp"></div>
${h.image ? '<label class="check"><input type="checkbox" name="remove_image" value="1"> ลบรูปเดิมออก</label>' : ''}
<label>คะแนนความขลัง</label><div class="rate">${[5, 4, 3, 2, 1].map(n => `<input type="radio" id="r${n}" name="rating" value="${n}" ${+h.rating === n ? 'checked' : ''}><label for="r${n}" title="${n} ดาว">★</label>`).join('')}</div>
<label>รีวิว / เหตุผลที่ลุ่มหลง</label><textarea name="review" rows="5" maxlength="1000">${esc(h.review)}</textarea>
<div class="row"><button>บันทึก</button><a class="btn ghost" href="/">ยกเลิก</a></div></form></div>`);

router.get('/heroes/new', need, (req, res) => res.send(heroForm(req, { rating: 5 }, '/heroes', 'จารึกพระเอกใหม่')));
router.post('/heroes', need, (req, res) => {
  const { h, err } = readHero(req.body);
  if (err) return res.status(400).send(heroForm(req, h, '/heroes', 'จารึกพระเอกใหม่', err));
  let image = null;
  try { image = saveImage(req.file); }
  catch { return res.status(400).send(heroForm(req, h, '/heroes', 'จารึกพระเอกใหม่', 'ไฟล์ต้องเป็นรูป JPG, PNG หรือ WEBP จริงเท่านั้น')); }
  try {
    const r = db.prepare('INSERT INTO heroes(user_id,name,series,actor,rating,review,image) VALUES(?,?,?,?,?,?,?)')
      .run(req.user.id, h.name, h.series, h.actor, h.rating, h.review, image);
    flash(req, `จารึก “${h.name}” ลงทำเนียบแล้ว`, 'add'); res.redirect('/heroes/' + r.lastInsertRowid);
  } catch (e) { removeImage(image); throw e; }
});

// ----- หน้ารายละเอียด + ความเห็น -----
const getHero = id => db.prepare('SELECT h.*,u.username FROM heroes h JOIN users u ON u.id=h.user_id WHERE h.id=?').get(id);
const del = (req, action, label, extra = '') => `<form method="post" action="${action}" class="inline" data-confirm="${esc(label)}">${csrf(req)}${extra}<button class="danger">ลบ</button></form>`;

router.get('/heroes/:id', (req, res) => {
  const id = toId(req.params.id), h = id && getHero(id);
  if (!h) return fail(req, res, 404, 'ไม่พบพระเอกคนนี้');
  const cs = db.prepare('SELECT c.*,u.username FROM comments c JOIN users u ON u.id=c.user_id WHERE hero_id=? ORDER BY c.id').all(id);
  const mine = req.user && req.user.id === h.user_id, admin = req.user && req.user.role === 'admin';
  res.send(page(req, h.name, `<div class="detail panel fx-target"><div class="poster">${img(h, true)}</div>
<div class="info"><h1>${esc(h.name)}</h1><img class="divider left" src="/img/divider.svg" alt="">
<div class="muted">${esc(h.series)}${h.actor ? ' · นักแสดง ' + esc(h.actor) : ''}</div>
<p class="stars big">${stars(h.rating)}</p><p class="review">${esc(h.review) || '<span class="muted">ยังไม่มีรีวิว</span>'}</p>
<div class="muted small">จารึกโดย ${esc(h.username)} · ${esc(h.created)}</div>
<div class="row">${mine ? `<a class="btn" href="/heroes/${h.id}/edit">แก้ไข</a>` : ''}
${mine || admin ? del(req, `/heroes/${h.id}/delete`, `ลบ “${h.name}” ออกจากทำเนียบ? การกระทำนี้ย้อนกลับไม่ได้`) : ''}</div></div></div>
<h2>เสียงจากผู้ศรัทธา (${cs.length})</h2>
${cs.map(c => `<div class="comment panel fx-target pop"><b>${esc(c.username)}</b> <span class="muted small">${esc(c.created)}</span>
<p class="review">${esc(c.body)}</p>${req.user && (req.user.id === c.user_id || admin) ? del(req, `/comments/${c.id}/delete`, 'ลบความเห็นนี้?') : ''}</div>`).join('') || '<p class="muted">ยังไม่มีผู้ใดกล่าวถึง</p>'}
${req.user ? `<div class="panel narrow"><form method="post" action="/heroes/${h.id}/comments" data-fx="add">${csrf(req)}<label>ร่วมแสดงความเห็น</label>
<textarea name="body" rows="3" maxlength="500" required></textarea><div class="row"><button>ส่งความเห็น</button></div></form></div>`
      : '<p><a href="/login">เข้าสู่ระบบ</a> เพื่อแสดงความเห็น</p>'}`));
});

// ตรวจความเป็นเจ้าของฝั่งเซิร์ฟเวอร์ทุกครั้ง (ไม่เชื่อปุ่มบนหน้าเว็บ)
const own = (req, res) => { const id = toId(req.params.id), h = id && getHero(id); if (!h) fail(req, res, 404, 'ไม่พบข้อมูล'); return h || null; };
const owner403 = (req, res) => fail(req, res, 403, 'แก้ไขได้เฉพาะข้อมูลของตัวเอง');

router.get('/heroes/:id/edit', need, (req, res) => {
  const h = own(req, res); if (!h) return;
  if (h.user_id !== req.user.id) return owner403(req, res);
  res.send(heroForm(req, h, `/heroes/${h.id}/edit`, 'แก้ไขข้อมูลพระเอก'));
});
router.post('/heroes/:id/edit', need, (req, res) => {
  const h0 = own(req, res); if (!h0) return;
  if (h0.user_id !== req.user.id) return owner403(req, res);
  const { h, err } = readHero(req.body);
  h.image = h0.image;
  if (err) return res.status(400).send(heroForm(req, h, `/heroes/${h0.id}/edit`, 'แก้ไขข้อมูลพระเอก', err));
  let image = h0.image, newImg = null;
  try { newImg = saveImage(req.file); }
  catch { return res.status(400).send(heroForm(req, h, `/heroes/${h0.id}/edit`, 'แก้ไขข้อมูลพระเอก', 'ไฟล์ต้องเป็นรูป JPG, PNG หรือ WEBP จริงเท่านั้น')); }
  if (newImg) image = newImg; else if (req.body.remove_image === '1') image = null;
  db.prepare('UPDATE heroes SET name=?,series=?,actor=?,rating=?,review=?,image=? WHERE id=? AND user_id=?')
    .run(h.name, h.series, h.actor, h.rating, h.review, image, h0.id, req.user.id);
  if (image !== h0.image) removeImage(h0.image);
  flash(req, 'แก้ไขข้อมูลแล้ว', 'edit'); res.redirect('/heroes/' + h0.id);
});
router.post('/heroes/:id/delete', need, (req, res) => {
  const h = own(req, res); if (!h) return;
  if (h.user_id !== req.user.id && req.user.role !== 'admin') return fail(req, res, 403, 'ลบได้เฉพาะข้อมูลของตัวเอง');
  db.prepare('DELETE FROM heroes WHERE id=?').run(h.id); removeImage(h.image);
  flash(req, `ลบ “${h.name}” แล้ว`, 'del'); res.redirect('/');
});

// ----- ฟอร์มที่ 2: ความเห็น -----
router.post('/heroes/:id/comments', need, (req, res) => {
  const h = own(req, res); if (!h) return;
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 500) { flash(req, 'ความเห็นต้อง 1-500 ตัวอักษร', 'err'); return res.redirect('/heroes/' + h.id); }
  db.prepare('INSERT INTO comments(hero_id,user_id,body) VALUES(?,?,?)').run(h.id, req.user.id, body);
  flash(req, 'ส่งความเห็นแล้ว', 'add'); res.redirect('/heroes/' + h.id);
});
router.post('/comments/:id/delete', need, (req, res) => {
  const id = toId(req.params.id), c = id && db.prepare('SELECT * FROM comments WHERE id=?').get(id);
  if (!c) return fail(req, res, 404, 'ไม่พบความเห็น');
  if (c.user_id !== req.user.id && req.user.role !== 'admin') return fail(req, res, 403, 'ลบได้เฉพาะความเห็นของตัวเอง');
  db.prepare('DELETE FROM comments WHERE id=?').run(c.id);
  flash(req, 'ลบความเห็นแล้ว', 'del'); res.redirect('/heroes/' + c.hero_id);
});

module.exports = router;
