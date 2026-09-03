// src/routes/usuarios.js
const router  = require('express').Router();
const make    = require('../controllers/crudFactory');
const pool    = require('../config/db');
const { crearUsuario, actualizarUsuario } = require('../controllers/auth.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');
const { esRolProtegido } = require('../utils/rolesProtegidos');

const ctrl = make('Usuarios', ['nombre','email','id_rol','estado'], 'id_usuario');

// GET / a medida (no crudFactory): el documento vive en "Clientes" (Usuarios no
// tiene columna propia), así que hace falta el LEFT JOIN para mostrarlo primero
// en la tabla y para poder buscar por documento.
router.get('/', verificarToken, tieneModulo('Usuarios', 'ver'), async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const params = [];
    let busquedaSql = '';
    if (q) {
      params.push(`%${q}%`);
      busquedaSql = `WHERE (u.nombre ILIKE $1 OR u.email ILIKE $1 OR c.documento ILIKE $1)`;
    }

    const paginar = page !== undefined;
    let limitOffsetSql = '';
    if (paginar) {
      const pagina = Math.max(parseInt(page) || 1, 1);
      const limite = Math.max(parseInt(limit) || 10, 1);
      const offset = (pagina - 1) * limite;
      params.push(limite, offset);
      limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const result = await pool.query(`
      SELECT u.id_usuario, u.nombre, u.email, u.id_rol, u.estado,
             c.tipo_doc, c.documento
             ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
      FROM "Usuarios" u
      LEFT JOIN "Clientes" c ON u.id_cliente = c.id_cliente
      ${busquedaSql}
      ORDER BY u.id_usuario DESC
      ${limitOffsetSql}
    `, params);

    if (!paginar) return res.json(result.rows);
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
    const data = result.rows.map(({ total_count, ...r }) => r);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/',            verificarToken, tieneModulo('Usuarios', 'crear'),  crearUsuario);
router.put('/:id',          verificarToken, tieneModulo('Usuarios', 'editar'), actualizarUsuario);

router.patch('/:id/estado', verificarToken, tieneModulo('Usuarios', 'estado'), async (req, res) => {
  try {
    const infoRes = await pool.query(
      `SELECT r.nombre AS rol, u.id_cliente FROM "Usuarios" u JOIN "Roles" r ON u.id_rol = r.id_rol WHERE u.id_usuario = $1`,
      [req.params.id]
    );
    if (!infoRes.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { rol, id_cliente } = infoRes.rows[0];
    if (esRolProtegido(rol)) {
      return res.status(403).json({ message: 'No se puede cambiar el estado de un administrador.' });
    }

    const result = await pool.query(`
      UPDATE "Usuarios"
      SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
      WHERE id_usuario = $1
      RETURNING *
    `, [req.params.id]);

    // Si el usuario tiene rol Cliente y está vinculado a un registro de Clientes,
    // su estado se mantiene sincronizado en ambas tablas.
    if (rol?.toLowerCase() === 'cliente' && id_cliente) {
      await pool.query(`UPDATE "Clientes" SET estado = $1 WHERE id_cliente = $2`, [result.rows[0].estado, id_cliente]);
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.get('/:id', verificarToken, tieneModulo('Usuarios', 'ver'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id_usuario, u.nombre, u.email, u.estado,
         u.ultimo_acceso, u.intentos_fallidos, u.bloqueado_hasta, u.fecha_creacion,
         r.nombre AS rol, r.id_rol,
         c.tipo_doc, c.documento, c.telefono, c.ciudad, c.direccion, c.id_barrio,
         b.nombre AS barrio
       FROM "Usuarios" u
       JOIN "Roles"    r ON u.id_rol     = r.id_rol
       LEFT JOIN "Clientes" c ON u.id_cliente = c.id_cliente
       LEFT JOIN "Barrios"  b ON c.id_barrio  = b.id_barrio
       WHERE u.id_usuario = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;