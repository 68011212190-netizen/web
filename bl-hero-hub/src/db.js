'use strict';
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { DB_PATH } = require('./config');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS heroes(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, series TEXT NOT NULL, actor TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), review TEXT, image TEXT,
  created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS comments(
  id INTEGER PRIMARY KEY, hero_id INTEGER NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP);
`);
// รองรับฐานข้อมูลเวอร์ชันเก่าที่ยังไม่มีคอลัมน์รูป
if (!db.prepare('PRAGMA table_info(heroes)').all().some(c => c.name === 'image')) db.exec('ALTER TABLE heroes ADD COLUMN image TEXT');

async function seedAdmin() {
  if (db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) return;
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  db.prepare("INSERT INTO users(username,hash,role) VALUES('admin',?,'admin')").run(await bcrypt.hash(pw, 12));
  console.log('สร้างแอดมินแล้ว  username: admin  password:', process.env.ADMIN_PASSWORD ? '(จาก ADMIN_PASSWORD)' : pw);
}
module.exports = { db, seedAdmin };
