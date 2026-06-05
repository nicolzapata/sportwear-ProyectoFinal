// src/routes/productos.js
const router = require('express').Router();
const {
  getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar
} = require('../controllers/productos.controller');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');

// GET público para listar productos publicados (catálogo)
router.get('/',               getProductos);
router.post('/',              verificarToken, tieneModulo('Productos'), crearProducto);
router.put('/:id',            verificarToken, tieneModulo('Productos'), actualizarProducto);
router.patch('/:id/estado',   verificarToken, tieneModulo('Productos'), toggleEstado);
router.patch('/:id/publicar', verificarToken, tieneModulo('Productos'), togglePublicar);

module.exports = router;