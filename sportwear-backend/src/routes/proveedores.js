// src/routes/proveedores.js
const router = require('express').Router();
const {
  getProveedores, getProveedorById, crearProveedor,
  actualizarProveedor, toggleEstado
} = require('../controllers/proveedores.controller');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, tieneModulo('Proveedores'), getProveedores);
router.get('/:id',          verificarToken, tieneModulo('Proveedores'), getProveedorById);
router.post('/',            verificarToken, tieneModulo('Proveedores'), crearProveedor);
router.put('/:id',          verificarToken, tieneModulo('Proveedores'), actualizarProveedor);
router.patch('/:id/estado', verificarToken, tieneModulo('Proveedores'), toggleEstado);

module.exports = router;