// src/routes/dashboard.js
const router = require('express').Router();
const { getResumen, getVentasMensuales } = require('../controllers/dashboard.controller');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, tieneModulo('Dashboard'), getResumen);
router.get('/ventas-mensuales', verificarToken, tieneModulo('Dashboard'), getVentasMensuales);

module.exports = router;