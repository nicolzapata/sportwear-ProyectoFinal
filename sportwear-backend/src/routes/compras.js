// src/routes/compras.js
const router = require('express').Router();
const { getCompras, getCompraById, crearCompra, cambiarEstado } = require('../controllers/compras.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, soloAdmin, getCompras);
router.get('/:id',          verificarToken, soloAdmin, getCompraById);
router.post('/',            verificarToken, soloAdmin, crearCompra);
router.patch('/:id/estado', verificarToken, soloAdmin, cambiarEstado);

module.exports = router;