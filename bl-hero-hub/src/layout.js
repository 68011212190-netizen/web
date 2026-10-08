'use strict';
const { esc } = require('./utils');

const csrf = req => `<input type="hidden" name="_csrf" value="${req.session.csrf}">`;

function page(req, title, body) {
  const u = req.user;
  const f = req.session.flash; delete req.session.flash;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b0607">
<title>${esc(title)} · BL Hero Hub</title><link rel="icon" href="/img/emblem.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chonburi&family=Sarabun:wght@400;600&display=swap">
<link rel="stylesheet" href="/css/style.css"></head><body>
<canvas id="fx"></canvas>
<header><a class="brand" href="/"><img src="/img/emblem.svg" alt="">BL Hero Hub</a>
<nav><a href="/">ทำเนียบพระเอก</a>
${u ? `<a href="/heroes/new">＋ เพิ่มพระเอก</a>${u.role === 'admin' ? '<a href="/admin">ห้องผู้ดูแล</a>' : ''}
<span class="who">${esc(u.username)} · ${u.role}</span>
<form method="post" action="/logout" class="inline">${csrf(req)}<button class="linkbtn">ออกจากระบบ</button></form>`
      : '<a href="/login">เข้าสู่ระบบ</a><a href="/register">สมัครสมาชิก</a>'}</nav></header>
${f ? `<div id="toast" class="toast ${esc(f.type)}" data-type="${esc(f.type)}" role="status">${esc(f.msg)}</div>` : ''}
<main>${body}</main>
<footer><img class="divider" src="/img/divider.svg" alt="">ทำเนียบพระเอกซีรีส์วาย · โปรเจกต์ส่งงานในห้องเรียน</footer>
<div id="modal" class="modal" hidden><div class="modal-box"><h3 id="modal-title"></h3><p id="modal-text"></p>
<div class="row center"><button type="button" id="modal-ok" class="danger">ยืนยัน</button><button type="button" id="modal-cancel" class="ghost">ยกเลิก</button></div></div></div>
<div id="lightbox" class="modal" hidden><img alt=""></div>
<script src="/js/app.js" defer></script></body></html>`;
}
const fail = (req, res, code, msg) => res.status(code).send(page(req, String(code), `<div class="panel center"><h1>${code}</h1><p>${esc(msg)}</p><a class="btn" href="/">กลับหน้าแรก</a></div>`));

module.exports = { page, csrf, fail };
