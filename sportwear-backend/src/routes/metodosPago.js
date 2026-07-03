// src/routes/metodosPago.js
const router = require('express').Router();
const {
  getMetodosPago, crearMetodoPago, actualizarMetodoPago, toggleEstado
} = require('../controllers/metodosPago.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/', getMetodosPago); // público (para mostrar opciones en checkout)
router.post('/',            verificarToken, tieneModulo('Pagos', 'crear'),  crearMetodoPago);
router.put('/:id',          verificarToken, tieneModulo('Pagos', 'editar'), actualizarMetodoPago);
router.patch('/:id/estado', verificarToken, tieneModulo('Pagos', 'editar'), toggleEstado);

module.exports = router;
