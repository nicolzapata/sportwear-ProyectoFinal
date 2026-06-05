const pool = require('./sportwear-backend/src/config/db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='Permisos'
      ORDER BY ordinal_position
    `);
    console.log('Esquema de tabla Permisos:');
    res.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`));
    
    // También mostrar algunos registros existentes
    const data = await pool.query('SELECT * FROM "Permisos" LIMIT 3');
    console.log('\nEjemplo de registros:');
    console.log(data.rows);
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
