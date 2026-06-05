const pool = require('./sportwear-backend/src/config/db');

async function check() {
  try {
    // Check Modulos
    const modulos = await pool.query(`SELECT * FROM "Modulos" ORDER BY nombre`);
    console.log('Módulos existentes:');
    modulos.rows.forEach(m => console.log(`  - ${m.nombre}`));
    
    // Check Permisos
    const permisos = await pool.query(`SELECT DISTINCT modulo FROM "Permisos" ORDER BY modulo`);
    console.log('\nMódulos en Permisos:');
    permisos.rows.forEach(p => console.log(`  - ${p.modulo}`));
    
    // Check constraint
    const constraints = await pool.query(`
      SELECT constraint_name, table_name, column_name
      FROM information_schema.constraint_column_usage
      WHERE table_name = 'Permisos'
    `);
    console.log('\nConstraints en Permisos:');
    constraints.rows.forEach(c => console.log(`  - ${c.constraint_name}: ${c.table_name}.${c.column_name}`));
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
