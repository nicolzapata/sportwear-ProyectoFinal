// src/routes/compras.js
const router = require('express').Router();
const { getCompras, getCompraById, crearCompra, cambiarEstado, anularCompra } = require('../controllers/compras.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',              verificarToken, tieneModulo('Compras', 'ver'),     getCompras);
router.get('/:id',           verificarToken, tieneModulo('Compras', 'ver'),     getCompraById);
router.post('/',             verificarToken, tieneModulo('Compras', 'crear'),   crearCompra);
router.patch('/:id/estado',  verificarToken, tieneModulo('Compras', 'editar'),  cambiarEstado);
router.patch('/:id/anular',  verificarToken, tieneModulo('Compras', 'anular'),  anularCompra);

module.exports = router;