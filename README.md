# 💜 BL Hero Hub — ทำเนียบพระเอกซีรีส์วาย (ธีมขลังไทย ดำ·แดง·ทอง·ขาว)

## โครงสร้างโปรเจกต์
```
server.js              จุดเริ่มต้นแอป (ประกอบ middleware + routes)
package.json
src/
  config.js            ค่าตั้งต้น/ตัวแปรแวดล้อม
  db.js                SQLite: ตาราง users, heroes, comments + สร้างแอดมิน
  utils.js             esc(), flash, rate limit, helper
  layout.js            template หน้าเว็บ + หน้า error
  middleware.js        helmet, session, โหลดผู้ใช้, CSRF, สิทธิ์ (need/adminOnly)
  upload.js            อัปโหลดรูปปลอดภัย (multer + ตรวจ magic bytes)
  routes/auth.js       สมัคร / ล็อกอิน / ออกจากระบบ
  routes/heroes.js     CRUD พระเอก (มีรูป, มีเจ้าของ) + ความเห็น
  routes/admin.js      หน้าผู้ดูแลระบบ
public/
  css/style.css        ธีม + animation
  js/app.js            อนุภาคทอง/แดง, ป๊อบอัพยืนยัน, พรีวิว/ขยายรูป
  img/                 ลายไทย, เส้นคั่น, ตราสัญลักษณ์ (SVG)
```

## รันในเครื่อง
```
npm install
ADMIN_PASSWORD=รหัสแอดมิน npm start        # Windows PowerShell: $env:ADMIN_PASSWORD="รหัส"; npm start
```
เปิด http://localhost:3000 — แอดมิน: `admin` / รหัสตาม ADMIN_PASSWORD

## ขึ้น GitHub
```
git init && git add . && git commit -m "BL Hero Hub"
git branch -M main
git remote add origin https://github.com/<ชื่อคุณ>/bl-hero-hub.git
git push -u origin main
```
(`.gitignore` กัน node_modules, ฐานข้อมูล, รูปอัปโหลด และ .env ไม่ให้ขึ้น GitHub)

## ขึ้นโฮส Render.com (ฟรี)
New → Web Service → เลือก repo · Build: `npm install` · Start: `npm start`
Environment: `NODE_ENV=production`, `SESSION_SECRET=<สุ่มยาว ๆ>`, `ADMIN_PASSWORD=<รหัสแอดมิน>`
> ฟรีเพลน ฐานข้อมูลและรูปที่อัปโหลดจะหายเมื่อ redeploy — เพิ่ม Disk (mount เช่น `/data`) แล้วตั้ง `DB_PATH=/data/data.db` และ `UPLOAD_DIR=/data/uploads` ถ้าต้องการถาวร

## ตามโจทย์
1. สมัคร/ล็อกอิน — bcrypt cost 12
2. 2 บทบาท — user / admin
3. CRUD มีเจ้าของ — พระเอก (แก้ได้เฉพาะเจ้าของ, ลบได้เจ้าของ+admin ตรวจฝั่งเซิร์ฟเวอร์)
4. 2 ฟอร์ม — เพิ่ม/แก้พระเอก (พร้อมรูป) และความเห็น บันทึก SQLite แล้วแสดงผล
5. หน้าแอดมิน — `/admin`

## การป้องกันการโจมตี (ไว้ตอบอาจารย์)
- **SQL Injection**: prepared statement ทุกคำสั่ง
- **XSS**: escape ทุกจุดด้วย `esc()` + CSP (helmet) ไม่มี inline script
- **CSRF**: token ต่อ session ตรวจทุก POST (รวมฟอร์มอัปโหลด) + `SameSite=Lax`
- **Brute force**: ล็อกอินผิด 5 ครั้ง/15 นาที, จำกัดการสมัคร
- **Session**: HttpOnly, Secure (production), regenerate หลังล็อกอิน, หมดอายุ 2 ชม.
- **IDOR / Access control**: เช็กเจ้าของและบทบาทที่เซิร์ฟเวอร์ทุก route, UPDATE มี `AND user_id=?`
- **File upload**: จำกัด 2MB/1 ไฟล์, ตรวจ magic bytes จริง (JPG/PNG/WEBP) ไม่เชื่อนามสกุลหรือ MIME ที่ client ส่ง, สุ่มชื่อไฟล์เอง (กัน path traversal / ทับไฟล์), เก็บนอกโค้ด, `nosniff`
- **User enumeration/timing**: ข้อความล็อกอินผิดเหมือนกัน + เทียบ dummy hash
- **Input validation**: จำกัดชนิด/ความยาวทุกฟิลด์, body limit 10kb, ID ต้องเป็นตัวเลข
- **Headers/Error**: helmet, ซ่อน X-Powered-By, ไม่โชว์ stack trace
