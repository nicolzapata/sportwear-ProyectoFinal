// src/routes/proveedores.js
const router = require('express').Router();
const {
  getProveedores, getProveedorById, crearProveedor,
  actualizarProveedor, toggleEstado
} = require('../controllers/proveedores.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, tieneModulo('Proveedores', 'ver'),    getProveedores);
router.get('/:id',          verificarToken, tieneModulo('Proveedores', 'ver'),    getProveedorById);
router.post('/',            verificarToken, tieneModulo('Proveedores', 'crear'),  crearProveedor);
router.put('/:id',          verificarToken, tieneModulo('Proveedores', 'editar'), actualizarProveedor);
router.patch('/:id/estado', verificarToken, tieneModulo('Proveedores', 'estado'), toggleEstado);

module.exports = router;