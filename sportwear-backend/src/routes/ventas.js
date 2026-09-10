// src/routes/ventas.js
const router = require('express').Router();
const {
  getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido,
  crearCarritoAbandonado, getMisPedidos, getComprobantePDF, getCreditoCliente,
  getPagosPorVenta, crearPago, pagarCuota, pagarTotal,
} = require('../controllers/ventas.controller');
const { verificarToken, soloCliente, tieneModulo } = require('../middlewares/auth.middleware');

router.post('/abandonado', crearCarritoAbandonado);

router.get('/mis-pedidos', verificarToken, soloCliente, getMisPedidos);
router.post('/mi-pedido',  verificarToken, soloCliente, crearMiPedido);
router.get('/:id/comprobante', verificarToken, getComprobantePDF); // admin o dueño de la venta

// ── NUEVO: debe ir ANTES de '/:id' — si no, Express interpreta "credito" como si fuera un :id ──
router.get('/credito/:id_cliente', verificarToken, tieneModulo('Ventas', 'crear'), getCreditoCliente);

// ── Pagos/abonos — antes vivían bajo /api/pagos; se fusionaron acá porque
// una venta ya es la dueña natural de su propio calendario de cuotas. Deben
// ir antes de '/:id' para que Express no confunda "pagos"/"cuota" con un id. ──
router.post('/cuota/:id',       verificarToken, soloCliente, pagarCuota);
router.post('/pagos',           verificarToken, tieneModulo('Ventas', 'crear'), crearPago);
router.get('/:id/pagos',        verificarToken, tieneModulo('Ventas', 'ver'),   getPagosPorVenta);
router.post('/:id/pagar-total', verificarToken, soloCliente, pagarTotal);

router.get('/',             verificarToken, tieneModulo('Ventas', 'ver'),    getVentas);
router.get('/:id',          verificarToken, tieneModulo('Ventas', 'ver'),    getVentaById);
router.post('/',            verificarToken, tieneModulo('Ventas', 'crear'),  crearVenta);
router.patch('/:id/estado', verificarToken, tieneModulo('Ventas', 'estado'), cambiarEstado);
router.patch('/:id/cancelar', verificarToken, soloCliente, cambiarEstado);

module.exports = router;