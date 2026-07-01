// src/routes/colores.js
const router = require('express').Router();
const {
  getColores, crearColor, actualizarColor, toggleEstado
} = require('../controllers/colores.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/', getColores); // público
router.post('/',            verificarToken, tieneModulo('Colores', 'crear'),  crearColor);
router.put('/:id',          verificarToken, tieneModulo('Colores', 'editar'), actualizarColor);
router.patch('/:id/estado', verificarToken, tieneModulo('Colores', 'estado'), toggleEstado);
// DELETE se agrega cuando el controller tenga eliminarColor

module.exports = router;