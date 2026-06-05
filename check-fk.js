const pool = require('./sportwear-backend/src/config/db');

async function check() {
  try {
    // Check foreign keys on Permisos table
    const fks = await pool.query(`
      SELECT tc.constraint_name, kcu.table_name, kcu.column_name, 
             ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = 'Permisos'
    `);
    console.log('Foreign Keys en Permisos:');
    if (fks.rows.length === 0) {
      console.log('  (ninguna)');
    } else {
      fks.rows.forEach(fk => console.log(`  - ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`));
    }
    
    // Check if Modulos table exists and is referenced
    const modulos = await pool.query(`
      SELECT * FROM "Modulos" LIMIT 5
    `);
    console.log(`\nTabla Modulos existe: sí (${modulos.rows.length} filas)`);
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
