// src/routes/compras.js
const router = require('express').Router();
const { getCompras, getCompraById, crearCompra, cambiarEstado } = require('../controllers/compras.controller');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, tieneModulo('Compras'), getCompras);
router.get('/:id',          verificarToken, tieneModulo('Compras'), getCompraById);
router.post('/',            verificarToken, tieneModulo('Compras'), crearCompra);
router.patch('/:id/estado', verificarToken, tieneModulo('Compras'), cambiarEstado);

module.exports = router;