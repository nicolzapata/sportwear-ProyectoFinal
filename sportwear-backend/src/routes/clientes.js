// src/routes/clientes.js
const router = require('express').Router();
const {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas, getClientesRolCliente
} = require('../controllers/clientes.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

// ── Rutas de perfil propio (cualquier usuario con id_cliente vinculado) ───────
router.get('/mi-perfil',            verificarToken, getMiPerfil);
router.put('/mi-perfil',            verificarToken, actualizarMiPerfil);
router.get('/rol-cliente', verificarToken, tieneModulo('Clientes', 'ver'), getClientesRolCliente);

// ── Rutas administrativas ─────────────────────────────────────────────────────
router.get('/',                     verificarToken, tieneModulo('Clientes', 'ver'),    getClientes);
router.get('/con-ventas',           verificarToken, tieneModulo('Clientes', 'ver'),    getClientesConVentas);
router.get('/:id',                  verificarToken, tieneModulo('Clientes', 'ver'),    getClienteById);
router.post('/',                    verificarToken, tieneModulo('Clientes', 'crear'),  crearCliente);
router.put('/:id',                  verificarToken, tieneModulo('Clientes', 'editar'), actualizarCliente);
router.patch('/:id/estado',         verificarToken, tieneModulo('Clientes', 'estado'), toggleEstado);
router.patch('/:id/permiso-cuotas', verificarToken, tieneModulo('Clientes', 'editar'), togglePermisoCuotas);

module.exports = router;