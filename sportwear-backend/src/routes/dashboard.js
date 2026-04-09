// src/routes/dashboard.js
const router = require('express').Router();
const { getResumen, getVentasMensuales } = require('../controllers/dashboard.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, soloAdmin, getResumen);
router.get('/ventas-mensuales', verificarToken, soloAdmin, getVentasMensuales);

module.exports = router;