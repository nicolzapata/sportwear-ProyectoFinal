const { Pool } = require('./sportwear-backend/node_modules/pg');

const pool = new Pool({
  user: 'postgres',
  password: 'zapata230707',
  host: 'localhost',
  port: 5432,
  database: 'SportWear'
});

const OFFICIAL_MODULES = [
  'Dashboard',
  'Usuarios',
  'Roles',
  'Productos',
  'Colores',
  'Catálogo',
  'Proveedores',
  'Compras',
  'PedidosVentas',
  'Pagos',
  'Configuración',
];

const ACCIONES = ['crear', 'leer', 'editar', 'eliminar'];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Primero, insertar módulos faltantes en Modulos
    console.log('Insertando módulos en tabla Modulos...');
    for (let i = 0; i < OFFICIAL_MODULES.length; i++) {
      const nombre = OFFICIAL_MODULES[i];
      const ruta = '/' + nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const exists = await client.query(
        `SELECT * FROM "Modulos" WHERE nombre = $1`,
        [nombre]
      );
      
      if (!exists.rows.length) {
        try {
          await client.query(
            `INSERT INTO "Modulos" (nombre, icono, ruta_base, orden, estado, fecha_creacion)
             VALUES ($1, '', $2, $3, 'Activo', NOW())`,
            [nombre, ruta, i + 1]
          );
          console.log(`  ✓ Insertado módulo: ${nombre}`);
        } catch (err) {
          console.log(`  ⚠ No se pudo insertar ${nombre}: ${err.message}`);
        }
      } else {
        console.log(`  - Módulo ya existe: ${nombre}`);
      }
    }

    // 2. Ahora insertar permisos en Permisos
    console.log('\nInsertando permisos en tabla Permisos...');
    for (const modulo of OFFICIAL_MODULES) {
      // Insertar acceso genérico solo si no existe
      const exists = await client.query(
        `SELECT id_permiso FROM "Permisos" WHERE modulo = $1 AND accion = 'acceso'`,
        [modulo]
      );

      if (!exists.rows.length) {
        try {
          const nombre = `${modulo.toLowerCase()}.acceso`;
          const descripcion = `Acceso al módulo ${modulo}`;
          
          await client.query(
            `INSERT INTO "Permisos" (nombre, descripcion, modulo, accion, estado, fecha_creacion)
             VALUES ($1, $2, $3, 'acceso', 'Activo', NOW())`,
            [nombre, descripcion, modulo]
          );
          console.log(`  ✓ Insertado permiso 'acceso' para: ${modulo}`);
        } catch (err) {
          console.log(`  ⚠ No se pudo insertar permiso para ${modulo}: ${err.message}`);
        }
      } else {
        console.log(`  - Permiso ya existe para: ${modulo}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed completado exitosamente');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
