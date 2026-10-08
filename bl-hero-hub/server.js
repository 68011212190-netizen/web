'use strict';
// BL Hero Hub — จุดเริ่มต้นของแอป (โค้ดแยกอยู่ใน src/)
const express = require('express');
const { PORT } = require('./src/config');
const { seedAdmin } = require('./src/db');
const { base, csrfCheck } = require('./src/middleware');
const { parseUpload } = require('./src/upload');
const { fail } = require('./src/layout');

const app = express();
base(app);
app.post(['/heroes', '/heroes/:id/edit'], parseUpload); // multipart ต้อง parse ก่อน CSRF
app.use(csrfCheck);
app.use(require('./src/routes/auth'));
app.use(require('./src/routes/heroes'));
app.use('/admin', require('./src/routes/admin'));
app.use((req, res) => fail(req, res, 404, 'ไม่พบหน้านี้'));
app.use((err, req, res, next) => { console.error(err); fail(req, res, 500, 'เกิดข้อผิดพลาดภายในระบบ'); });

seedAdmin().then(() => app.listen(PORT, () => console.log('รันที่พอร์ต', PORT)));
