// src/routes/metodosPago.js
const router = require('express').Router();
const {
  getMetodosPago, crearMetodoPago, actualizarMetodoPago, toggleEstado
} = require('../controllers/metodosPago.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

// ── CORREGIDO: la gestión de métodos de pago ahora vive dentro de Ventas
// (el módulo "Pagos" se eliminó por completo) — se gatea con los permisos
// ya existentes de Ventas en vez de uno nuevo. ──
router.get('/', getMetodosPago); // público (para mostrar opciones en checkout)
router.post('/',            verificarToken, tieneModulo('Ventas', 'crear'),  crearMetodoPago);
router.put('/:id',          verificarToken, tieneModulo('Ventas', 'crear'),  actualizarMetodoPago);
router.patch('/:id/estado', verificarToken, tieneModulo('Ventas', 'estado'), toggleEstado);

module.exports = router;
