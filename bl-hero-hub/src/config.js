'use strict';
const path = require('path');
module.exports = {
  PROD: process.env.NODE_ENV === 'production',
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data.db'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  MAX_IMG: 2 * 1024 * 1024 // 2MB
};
