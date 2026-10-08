// เอฟเฟกต์หน้าเว็บ: อนุภาคทอง/แดง, ป๊อบอัพยืนยัน, พรีวิวรูป, ขยายรูป
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = $('#fx'), ctx = cv.getContext('2d');
  const COLORS = { add: ['#f0d27a', '#d4af37', '#fff'], edit: ['#fff', '#f0d27a'], del: ['#b3122b', '#ff5a4d', '#7a0a1a'], err: ['#b3122b', '#ff5a4d'], ok: ['#f0d27a', '#d4af37'] };
  let ps = [];
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
  addEventListener('resize', fit); fit();

  function burst(x, y, type = 'ok', n = 46) {
    if (reduce) return;
    const cols = COLORS[type] || COLORS.ok;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 5;
      ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, r: 1.5 + Math.random() * 3, life: 0, max: 50 + Math.random() * 40, c: cols[i % cols.length], g: 0.07 });
    }
  }
  function ember() { // เถ้าถ่านลอยขึ้นเบา ๆ เป็นบรรยากาศ
    ps.push({ x: Math.random() * cv.width, y: cv.height + 6, vx: (Math.random() - .5) * .4, vy: -(.4 + Math.random() * .9), r: .8 + Math.random() * 1.8, life: 0, max: 260 + Math.random() * 200, c: Math.random() < .5 ? '#d4af37' : '#b3122b', g: 0, amb: true });
  }
  (function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!reduce && Math.random() < .35 && ps.length < 160) ember();
    ps = ps.filter(p => p.life < p.max);
    for (const p of ps) {
      p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy;
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, p.amb ? t * .55 : t);
      ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1; requestAnimationFrame(loop);
  })();

  // toast + ระเบิดอนุภาคตามประเภท (เพิ่ม=ทอง, ลบ=แดง, แก้ไข=ขาว)
  const t = $('#toast');
  if (t) { const r = t.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, t.dataset.type, 60); }

  // ป๊อบอัพยืนยัน
  const modal = $('#modal');
  function ask(text) {
    return new Promise(res => {
      $('#modal-title').textContent = 'โปรดยืนยัน'; $('#modal-text').textContent = text;
      modal.hidden = false; $('#modal-ok').focus();
      const done = v => { modal.hidden = true; $('#modal-ok').onclick = $('#modal-cancel').onclick = modal.onclick = document.onkeydown = null; res(v); };
      $('#modal-ok').onclick = () => done(true); $('#modal-cancel').onclick = () => done(false);
      modal.onclick = e => { if (e.target === modal) done(false); };
      document.onkeydown = e => { if (e.key === 'Escape') done(false); };
    });
  }
  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.dataset.go || !(f.dataset.confirm || f.dataset.fx)) return;
    e.preventDefault();
    const btn = e.submitter || f.querySelector('button'), r = btn.getBoundingClientRect();
    if (f.dataset.confirm) {
      if (!await ask(f.dataset.confirm)) return;
      const tg = f.closest('.fx-target');
      if (tg) { const b = tg.getBoundingClientRect(); tg.classList.add('burn'); burst(b.left + b.width / 2, b.top + b.height / 2, 'del', 70); await wait(650); }
    } else { burst(r.left + r.width / 2, r.top + r.height / 2, 'add', 50); await wait(450); }
    f.dataset.go = '1'; f.submit();
  });

  // พรีวิวรูปก่อนอัปโหลด (ใช้ data: URL เพราะ CSP ไม่อนุญาต blob:)
  const inp = $('#image');
  if (inp) inp.addEventListener('change', () => {
    const file = inp.files[0], box = $('#preview'); if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('รูปใหญ่เกิน 2MB'); inp.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { box.innerHTML = ''; const im = new Image(); im.src = fr.result; box.appendChild(im); burst(innerWidth / 2, innerHeight / 2, 'ok', 25); };
    fr.readAsDataURL(file);
  });

  // คลิกรูปเพื่อขยาย
  const lb = $('#lightbox');
  document.addEventListener('click', e => {
    if (e.target.matches('img[data-zoom]')) { lb.firstElementChild.src = e.target.src; lb.hidden = false; }
    else if (!lb.hidden) lb.hidden = true;
  });
})();
