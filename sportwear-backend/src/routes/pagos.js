// src/routes/pagos.js
const router = require('express').Router();
const pool   = require('../config/db');
const {
  getPagos, getPagoById, crearPago, cambiarEstado, pagarCuota
} = require('../controllers/pagos.controller');
const {
  verificarToken, soloAdmin, soloCliente
} = require('../middlewares/auth.middleware');

// ── Rutas de Admin ─────────────────────────────────────────────────────────
router.get('/',             verificarToken, soloAdmin, getPagos);
router.get('/:id',          verificarToken, soloAdmin, getPagoById);
router.post('/',            verificarToken, soloAdmin, crearPago);
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado);

// ── Rutas de Cliente ───────────────────────────────────────────────────────

// GET /api/pagos/mis-pagos  → todos los pagos del cliente autenticado
router.get('/mis-pagos', verificarToken, soloCliente, async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;

    const result = await pool.query(`
      SELECT pa.*, v.id_cliente
      FROM "PagosAbonos" pa
      JOIN "Ventas" v ON pa.id_venta = v.id_venta
      WHERE v.id_cliente = $1
      ORDER BY pa.id_pago DESC
    `, [id_cliente]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pagar una cuota específica
router.post('/cuota/:id', verificarToken, soloCliente, pagarCuota);

module.exports = router;