// src/routes/clientes.js
const router = require('express').Router();
const {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas 
} = require('../controllers/clientes.controller');
const { verificarToken, soloAdmin, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',                    verificarToken, tieneModulo('Clientes'), getClientes);
router.get('/con-ventas',          verificarToken, tieneModulo('Clientes'), getClientesConVentas);
router.get('/:id',                 verificarToken, tieneModulo('Clientes'), getClienteById);
router.post('/',                   verificarToken, tieneModulo('Clientes'), crearCliente);
router.put('/:id',                 verificarToken, tieneModulo('Clientes'), actualizarCliente);
router.patch('/:id/estado',        verificarToken, tieneModulo('Clientes'), toggleEstado);
router.patch('/:id/permiso-pagos', verificarToken, tieneModulo('Clientes'), togglePermisoPagos);
router.patch('/:id/permiso-cuotas',verificarToken, tieneModulo('Clientes'), togglePermisoCuotas);
module.exports = router;