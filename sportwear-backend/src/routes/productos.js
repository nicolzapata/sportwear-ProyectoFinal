// src/routes/productos.js
const router = require('express').Router();
const {
  getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar, eliminarProducto
} = require('../controllers/productos.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/', getProductos); // público
router.post('/',              verificarToken, tieneModulo('Productos', 'crear'),    crearProducto);
router.put('/:id',            verificarToken, tieneModulo('Productos', 'editar'),   actualizarProducto);
router.patch('/:id/estado',   verificarToken, tieneModulo('Productos', 'estado'),   toggleEstado);
router.patch('/:id/publicar', verificarToken, tieneModulo('Productos', 'publicar'), togglePublicar);
router.delete('/:id',         verificarToken, tieneModulo('Productos', 'eliminar'), eliminarProducto);

module.exports = router;