// src/routes/ventas.js
const router = require('express').Router();
const {
  getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido,
  crearCarritoAbandonado, getMisPedidos, getComprobantePDF, getCreditoCliente,
} = require('../controllers/ventas.controller');
const { verificarToken, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.post('/abandonado', crearCarritoAbandonado);

router.get('/mis-pedidos', verificarToken, soloCliente, getMisPedidos);
router.post('/mi-pedido',  verificarToken, soloCliente, crearMiPedido);
router.get('/:id/comprobante', verificarToken, getComprobantePDF); // admin o dueño de la venta

// ── NUEVO: debe ir ANTES de '/:id' — si no, Express interpreta "credito" como si fuera un :id ──
router.get('/credito/:id_cliente', verificarToken, tieneModulo('Ventas', 'crear'), getCreditoCliente);

router.get('/',             verificarToken, tieneModulo('Ventas', 'ver'),    getVentas);
router.get('/:id',          verificarToken, tieneModulo('Ventas', 'ver'),    getVentaById);
router.post('/',            verificarToken, tieneModulo('Ventas', 'crear'),  crearVenta);
router.patch('/:id/estado', verificarToken, tieneModulo('Ventas', 'estado'), cambiarEstado);
router.patch('/:id/cancelar', verificarToken, soloCliente, cambiarEstado);

module.exports = router;