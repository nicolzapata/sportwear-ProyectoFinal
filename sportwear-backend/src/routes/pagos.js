// src/routes/pagos.js
const router = require('express').Router();
const pool   = require('../config/db');
const {
  getPagos, getPagoById, getPagosPorVenta, crearPago, cambiarEstado, pagarCuota, pagarTotal
} = require('../controllers/pagos.controller');
const {
  verificarToken, soloCliente, tieneModulo, tieneAlgunModulo
} = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, tieneAlgunModulo('Pagos', 'Ventas'), getPagos);

// Rutas de cliente y con segmento fijo: deben ir ANTES de '/:id' para que Express
// no las confunda con un id (ej. GET /mis-pagos no debe matchear GET /:id).
router.get('/mis-pagos', verificarToken, soloCliente, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pa.*, v.id_cliente
       FROM "PagosAbonos" pa
       JOIN "Ventas" v ON pa.id_venta = v.id_venta
       WHERE v.id_cliente = $1
       ORDER BY pa.id_pago DESC`,
      [req.usuario.id_cliente]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/cuota/:id',       verificarToken, soloCliente, pagarCuota);
router.post('/venta/:id/total', verificarToken, soloCliente, pagarTotal);

// ── NUEVO: calendario completo de cuotas de una venta (pasadas y futuras,
// sin la ventana de "próximas 3" que sí aplica al listado general) — para
// el modal de detalle de un pago. ──
router.get('/venta/:id_venta/todas', verificarToken, tieneAlgunModulo('Pagos', 'Ventas'), getPagosPorVenta);

router.get('/:id',          verificarToken, tieneAlgunModulo('Pagos', 'Ventas'), getPagoById);
router.post('/',            verificarToken, tieneModulo('Pagos', 'crear'),  crearPago);
router.patch('/:id/estado', verificarToken, tieneModulo('Pagos', 'estado'), cambiarEstado);

module.exports = router;