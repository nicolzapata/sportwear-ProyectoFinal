const pool = require('./sportwear-backend/src/config/db');
pool.query("SELECT datname FROM pg_database WHERE datname = 'SportWear'")
  .then(r => console.log('DB exists:', r.rows.length > 0))
  .catch(e => console.log('Error:', e.message));