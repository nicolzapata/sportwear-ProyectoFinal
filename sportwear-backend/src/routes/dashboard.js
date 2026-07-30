// src/routes/dashboard.js
const router = require('express').Router();
const { getResumen, getVentasMensuales, getComprasMensuales, getReporteVentas } = require('../controllers/dashboard.controller');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, tieneModulo('Dashboard'), getResumen);
router.get('/ventas-mensuales', verificarToken, tieneModulo('Dashboard'), getVentasMensuales);
router.get('/compras-mensuales', verificarToken, tieneModulo('Dashboard'), getComprasMensuales);
// ── NUEVO: reporte de ventas por rango de fechas, con sus propios totales ──
router.get('/reporte', verificarToken, tieneModulo('Dashboard'), getReporteVentas);

module.exports = router;