// src/routes/ventas.js
const router = require('express').Router();
const {
  getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido,
  crearCarritoAbandonado, getMisPedidos,
} = require('../controllers/ventas.controller');
const { verificarToken, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.post('/abandonado', crearCarritoAbandonado);

router.get('/mis-pedidos', verificarToken, soloCliente, getMisPedidos);
router.post('/mi-pedido',  verificarToken, soloCliente, crearMiPedido);

router.get('/',             verificarToken, tieneModulo('PedidosVentas', 'ver'),    getVentas);
router.get('/:id',          verificarToken, tieneModulo('PedidosVentas', 'ver'),    getVentaById);
router.post('/',            verificarToken, tieneModulo('PedidosVentas', 'crear'),  crearVenta);
router.patch('/:id/estado', verificarToken, tieneModulo('PedidosVentas', 'estado'), cambiarEstado);
router.patch('/:id/cancelar', verificarToken, soloCliente, cambiarEstado);

module.exports = router;