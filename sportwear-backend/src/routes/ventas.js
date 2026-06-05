// src/routes/ventas.js
const router = require('express').Router();
const {
  getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido,
  crearCarritoAbandonado, getMisPedidos,
} = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.post('/abandonado', crearCarritoAbandonado);

// ✅ NUEVO: ruta para clientes
router.get('/mis-pedidos', verificarToken, soloCliente, getMisPedidos);
router.post('/mi-pedido', verificarToken, soloCliente, crearMiPedido);

router.get('/',             verificarToken, tieneModulo('PedidosVentas'), getVentas);
router.get('/:id',          verificarToken, tieneModulo('PedidosVentas'), getVentaById);
router.post('/',            verificarToken, tieneModulo('PedidosVentas'), crearVenta);
router.patch('/:id/estado', verificarToken, tieneModulo('PedidosVentas'), cambiarEstado);
router.patch('/:id/cancelar', verificarToken, soloCliente, cambiarEstado);

module.exports = router;