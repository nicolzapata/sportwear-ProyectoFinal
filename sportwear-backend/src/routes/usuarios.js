// src/routes/usuarios.js
const router  = require('express').Router();
const make    = require('../controllers/crudFactory');
const pool    = require('../config/db');
const { crearUsuario, actualizarUsuario } = require('../controllers/auth.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');
const { esRolProtegido } = require('../utils/rolesProtegidos');

const ctrl = make('Usuarios', ['nombre','email','id_rol','estado'], 'id_usuario');

router.get('/',             verificarToken, tieneModulo('Usuarios', 'ver'),    ctrl.getAll);
router.post('/',            verificarToken, tieneModulo('Usuarios', 'crear'),  crearUsuario);
router.put('/:id',          verificarToken, tieneModulo('Usuarios', 'editar'), actualizarUsuario);

router.patch('/:id/estado', verificarToken, tieneModulo('Usuarios', 'estado'), async (req, res) => {
  try {
    const rolRes = await pool.query(
      `SELECT r.nombre FROM "Usuarios" u JOIN "Roles" r ON u.id_rol = r.id_rol WHERE u.id_usuario = $1`,
      [req.params.id]
    );
    if (!rolRes.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (esRolProtegido(rolRes.rows[0].nombre)) {
      return res.status(403).json({ message: 'No se puede cambiar el estado de un administrador.' });
    }
    return ctrl.cambiarEstado(req, res);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.get('/:id', verificarToken, tieneModulo('Usuarios', 'ver'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id_usuario, u.nombre, u.email, u.estado,
         u.ultimo_acceso, u.intentos_fallidos, u.bloqueado_hasta, u.fecha_creacion,
         r.nombre AS rol, r.id_rol,
         c.tipo_doc, c.documento, c.telefono, c.ciudad, c.direccion,
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