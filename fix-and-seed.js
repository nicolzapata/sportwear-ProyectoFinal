const pool = require('./sportwear-backend/src/config/db');

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
];

const ACCIONES = ['ver', 'crear', 'editar', 'eliminar'];

async function fixAndSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Insertar módulos oficiales en Modulos ──────────────────────────────
    console.log('── Paso 1: Sincronizando tabla Modulos ──');
    for (let i = 0; i < OFFICIAL_MODULES.length; i++) {
      const nombre = OFFICIAL_MODULES[i];
      const ruta = '/' + nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Buscar si ya existe (ignorando capitalización)
      const existe = await client.query(
        `SELECT nombre FROM "Modulos" WHERE UPPER(nombre) = UPPER($1)`,
        [nombre]
      );

      if (!existe.rows.length) {
        await client.query(
          `INSERT INTO "Modulos" (nombre, icono, ruta_base, orden, estado, fecha_creacion)
           VALUES ($1, '', $2, $3, 'Activo', NOW())`,
          [nombre, ruta, i + 1]
        );
        console.log(`  ✓ Insertado módulo: ${nombre}`);
      } else if (existe.rows[0].nombre !== nombre) {
        // Existe pero con capitalización incorrecta → actualizar
        await client.query(
          `UPDATE "Modulos" SET nombre = $1 WHERE UPPER(nombre) = UPPER($1)`,
          [nombre]
        );
        console.log(`  ✎ Corregida capitalización: ${existe.rows[0].nombre} → ${nombre}`);
      } else {
        console.log(`  - Ya existe: ${nombre}`);
      }
    }

    // ── 2. Normalizar módulos en Permisos (corregir capitalización) ───────────
    console.log('\n── Paso 2: Normalizando módulos en Permisos ──');
    for (const mod of OFFICIAL_MODULES) {
      const result = await client.query(
        `UPDATE "Permisos"
         SET modulo = $1
         WHERE UPPER(modulo) = UPPER($1) AND modulo <> $1`,
        [mod]
      );
      if (result.rowCount > 0) {
        console.log(`  ✎ Corregidos ${result.rowCount} permisos → modulo = '${mod}'`);
      }
    }

    // ── 3. Insertar permisos faltantes ────────────────────────────────────────
    console.log('\n── Paso 3: Insertando permisos faltantes ──');
    for (const modulo of OFFICIAL_MODULES) {
      for (const accion of ACCIONES) {
        const nombre = `${modulo.toLowerCase().replace(/[^a-z0-9]/g, '')}.${accion}`;

        const existe = await client.query(
          `SELECT 1 FROM "Permisos"
           WHERE UPPER(modulo) = UPPER($1) AND LOWER(accion) = LOWER($2)`,
          [modulo, accion]
        );

        if (!existe.rows.length) {
          await client.query(
            `INSERT INTO "Permisos" (nombre, descripcion, modulo, accion, estado, fecha_creacion)
             VALUES ($1, $2, $3, $4, 'Activo', NOW())`,
            [
              nombre,
              `Permiso para ${accion} en módulo ${modulo}`,
              modulo,
              accion,
            ]
          );
          console.log(`  ✓ Insertado: ${nombre}`);
        } else {
          console.log(`  - Ya existe: ${modulo}.${accion}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Fix y seed completados exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

fixAndSeed();