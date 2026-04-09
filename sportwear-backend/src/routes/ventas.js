// src/routes/ventas.js
const router = require('express').Router();
const {
  getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido,
  crearCarritoAbandonado, getMisPedidos,
} = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin, soloCliente } = require('../middlewares/auth.middleware');

router.post('/abandonado', crearCarritoAbandonado);

// ✅ NUEVO: ruta para clientes
router.get('/mis-pedidos', verificarToken, soloCliente, getMisPedidos);
router.post('/mi-pedido', verificarToken, soloCliente, crearMiPedido);

router.get('/',             verificarToken, soloAdmin, getVentas);
router.get('/:id',          verificarToken, soloAdmin, getVentaById);
router.post('/',            verificarToken, soloAdmin, crearVenta);
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado);
router.patch('/:id/cancelar', verificarToken, soloCliente, cambiarEstado);

module.exports = router;