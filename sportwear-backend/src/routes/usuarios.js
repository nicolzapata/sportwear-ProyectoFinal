// src/routes/usuarios.js
const router  = require('express').Router();
const make    = require('../controllers/crudFactory');
const pool    = require('../config/db');
const { crearUsuario, actualizarUsuario } = require('../controllers/auth.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

const ctrl = make('Usuarios', ['nombre','email','id_rol','estado'], 'id_usuario');

router.get('/',             verificarToken, soloAdmin, ctrl.getAll);
router.put('/:id',          verificarToken, soloAdmin, actualizarUsuario);
router.patch('/:id/estado', verificarToken, soloAdmin, ctrl.cambiarEstado);
router.patch('/:id/permiso-cuotas', verificarToken, soloAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE "Usuarios" SET permiso_cuotas = NOT permiso_cuotas WHERE id_usuario = $1 RETURNING id_usuario, permiso_cuotas`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/',            verificarToken, soloAdmin, crearUsuario);

/* ── Detalle completo: usuario + rol + cliente ── */
router.get('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.email,
         u.estado,
         u.permiso_cuotas,
         u.ultimo_acceso,
         u.intentos_fallidos,
         u.bloqueado_hasta,
         u.fecha_creacion,
         r.nombre        AS rol,
         r.id_rol,
         c.tipo_doc,
         c.documento,
         c.telefono,
         c.ciudad,
         c.direccion,
         b.nombre        AS barrio,
         b.comuna
        FROM "Usuarios" u
        JOIN "Roles"    r ON u.id_rol      = r.id_rol
        LEFT JOIN "Clientes" c ON u.id_cliente  = c.id_cliente
        LEFT JOIN "Barrios"  b ON c.id_barrio   = b.id_barrio
        WHERE u.id_usuario = $1`,
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;