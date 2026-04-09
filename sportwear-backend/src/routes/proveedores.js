// src/routes/proveedores.js
const router = require('express').Router();
const {
  getProveedores, getProveedorById, crearProveedor,
  actualizarProveedor, toggleEstado
} = require('../controllers/proveedores.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',             verificarToken, soloAdmin, getProveedores);
router.get('/:id',          verificarToken, soloAdmin, getProveedorById);
router.post('/',            verificarToken, soloAdmin, crearProveedor);
router.put('/:id',          verificarToken, soloAdmin, actualizarProveedor);
router.patch('/:id/estado', verificarToken, soloAdmin, toggleEstado);

module.exports = router;