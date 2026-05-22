const pool = require('./sportwear-backend/src/config/db');
pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
  .then(r => console.log('Tables:', r.rows.map(t => t.tablename)))
  .catch(e => console.log('Error:', e.message));