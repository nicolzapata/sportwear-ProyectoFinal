// src/routes/clientes.js
const router = require('express').Router();
const {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas 
} = require('../controllers/clientes.controller');
const { verificarToken, soloAdmin, soloCliente } = require('../middlewares/auth.middleware');

router.get('/mi-perfil', verificarToken, soloCliente, getMiPerfil);
router.put('/mi-perfil', verificarToken, soloCliente, actualizarMiPerfil);
router.get('/',                    verificarToken, soloAdmin, getClientes);
router.get('/con-ventas', verificarToken, soloAdmin, getClientesConVentas);
router.get('/debug', debugClientesVentas);
router.get('/:id',                 verificarToken, getClienteById);
router.post('/',                   verificarToken, soloAdmin, crearCliente);
router.put('/:id',                 verificarToken, soloAdmin, actualizarCliente);
router.patch('/:id/estado',        verificarToken, soloAdmin, toggleEstado);
router.patch('/:id/permiso-pagos', verificarToken, soloAdmin, togglePermisoPagos);
router.patch('/:id/permiso-cuotas', verificarToken, soloAdmin, togglePermisoCuotas);

module.exports = router;