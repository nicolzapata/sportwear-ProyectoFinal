// src/routes/productos.js
const router = require('express').Router();
const {
  getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar
} = require('../controllers/productos.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',               getProductos);                             // público
router.post('/',              verificarToken, soloAdmin, crearProducto);
router.put('/:id',            verificarToken, soloAdmin, actualizarProducto);
router.patch('/:id/estado',   verificarToken, soloAdmin, toggleEstado);
router.patch('/:id/publicar', verificarToken, soloAdmin, togglePublicar);

module.exports = router;