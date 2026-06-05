// scripts/assign_admin_permisos.js
const pool = require('../src/config/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleRes = await client.query(`SELECT id_rol FROM "Roles" WHERE UPPER(nombre) IN ('ADMINISTRADOR','ADMIN') LIMIT 1`);
    if (!roleRes.rows.length) {
      console.error('Rol Admin no encontrado.');
      await client.query('ROLLBACK');
      return process.exit(1);
    }
    const id_rol = roleRes.rows[0].id_rol;

    const permsRes = await client.query(`SELECT id_permiso FROM "Permisos" WHERE estado = 'Activo'`);
    if (!permsRes.rows.length) {
      console.log('No hay permisos activos para asignar.');
      await client.query('ROLLBACK');
      return process.exit(0);
    }

    for (const { id_permiso } of permsRes.rows) {
      await client.query(
        `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado)
         VALUES ($1, $2, 'Activo')
         ON CONFLICT (id_rol, id_permiso) DO UPDATE SET estado = 'Activo'`,
        [id_rol, id_permiso]
      );
    }

    await client.query('COMMIT');
    console.log(`Asignados ${permsRes.rows.length} permisos al rol Admin (id_rol=${id_rol}).`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error asignando permisos al Admin:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
  }
})();
