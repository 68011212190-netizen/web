'use strict';
const router = require('express').Router();
const { db } = require('../db');
const { esc, toId, flash } = require('../utils');
const { page, csrf, fail } = require('../layout');
const { need, adminOnly } = require('../middleware');
const { removeImage } = require('../upload');

router.use(need, adminOnly); // ทุกเส้นทางใต้ /admin เฉพาะ admin

router.get('/', (req, res) => {
  const users = db.prepare('SELECT u.*,(SELECT COUNT(*) FROM heroes WHERE user_id=u.id) hc FROM users u ORDER BY u.id').all();
  const heroes = db.prepare('SELECT h.id,h.name,h.series,u.username FROM heroes h JOIN users u ON u.id=h.user_id ORDER BY h.id DESC LIMIT 50').all();
  const st = db.prepare('SELECT (SELECT COUNT(*) FROM users) u,(SELECT COUNT(*) FROM heroes) h,(SELECT COUNT(*) FROM comments) c').get();
  const f = (action, label, text, extra = '') => `<form method="post" action="${action}" class="inline" data-confirm="${esc(text)}">${csrf(req)}${extra}<button class="${label === 'ลบ' ? 'danger' : ''}">${label}</button></form>`;
  res.send(page(req, 'ห้องผู้ดูแล', `<div class="panel"><h1>ห้องผู้ดูแลระบบ</h1><img class="divider left" src="/img/divider.svg" alt="">
<div class="stats"><div><b>${st.u}</b>สมาชิก</div><div><b>${st.h}</b>พระเอก</div><div><b>${st.c}</b>ความเห็น</div></div></div>
<h2>สมาชิก</h2><div class="tbl"><table><tr><th>ID</th><th>ชื่อผู้ใช้</th><th>บทบาท</th><th>โพสต์</th><th>จัดการ</th></tr>
${users.map(u => `<tr class="fx-target"><td>${u.id}</td><td>${esc(u.username)}</td><td>${u.role}</td><td>${u.hc}</td><td>${u.id === req.user.id ? '(คุณ)' :
    f(`/admin/users/${u.id}/role`, u.role === 'admin' ? 'ลดเป็น user' : 'เลื่อนเป็น admin', 'เปลี่ยนบทบาทของ ' + u.username + '?', `<input type="hidden" name="role" value="${u.role === 'admin' ? 'user' : 'admin'}">`) +
    f(`/admin/users/${u.id}/delete`, 'ลบ', `ลบสมาชิก ${u.username} พร้อมข้อมูลทั้งหมดของเขา?`)}</td></tr>`).join('')}</table></div>
<h2>พระเอกล่าสุด (ดูแลเนื้อหา)</h2><div class="tbl"><table><tr><th>ชื่อ</th><th>ซีรีส์</th><th>เจ้าของ</th><th>จัดการ</th></tr>
${heroes.map(h => `<tr class="fx-target"><td><a href="/heroes/${h.id}">${esc(h.name)}</a></td><td>${esc(h.series)}</td><td>${esc(h.username)}</td>
<td>${f(`/heroes/${h.id}/delete`, 'ลบ', `ลบ “${h.name}” ?`)}</td></tr>`).join('') || '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>'}</table></div>`));
});

router.post('/users/:id/role', (req, res) => {
  const id = toId(req.params.id), role = req.body.role;
  if (!id || id === req.user.id || !['user', 'admin'].includes(role)) return fail(req, res, 400, 'คำขอไม่ถูกต้อง');
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, id);
  flash(req, 'เปลี่ยนบทบาทแล้ว', 'edit'); res.redirect('/admin');
});
router.post('/users/:id/delete', (req, res) => {
  const id = toId(req.params.id);
  if (!id || id === req.user.id) return fail(req, res, 400, 'คำขอไม่ถูกต้อง');
  db.prepare('SELECT image FROM heroes WHERE user_id=? AND image IS NOT NULL').all(id).forEach(r => removeImage(r.image));
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  flash(req, 'ลบสมาชิกแล้ว', 'del'); res.redirect('/admin');
});

module.exports = router;
