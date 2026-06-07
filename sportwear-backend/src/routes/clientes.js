// src/routes/clientes.js
const router = require('express').Router();
const {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas 
} = require('../controllers/clientes.controller');
const { verificarToken, soloAdmin, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',                    verificarToken, tieneModulo('Usuarios'), getClientes);
router.get('/con-ventas',          verificarToken, tieneModulo('Usuarios'), getClientesConVentas);
router.get('/:id',                 verificarToken, tieneModulo('Usuarios'), getClienteById);
router.post('/',                   verificarToken, tieneModulo('Usuarios'), crearCliente);
router.put('/:id',                 verificarToken, tieneModulo('Usuarios'), actualizarCliente);
router.patch('/:id/estado',        verificarToken, tieneModulo('Usuarios'), toggleEstado);
router.patch('/:id/permiso-pagos', verificarToken, tieneModulo('Usuarios'), togglePermisoPagos);
router.patch('/:id/permiso-cuotas',verificarToken, tieneModulo('Usuarios'), togglePermisoCuotas);
module.exports = router;