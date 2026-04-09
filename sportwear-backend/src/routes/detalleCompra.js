// src/routes/detalleCompra.js
const router = require('express').Router();
const {
  getDetalles, getDetalleById, crearDetalle,
  actualizarDetalle, eliminarDetalle
} = require('../controllers/detalleCompra.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',       verificarToken, soloAdmin, getDetalles);
router.get('/:id',    verificarToken, soloAdmin, getDetalleById);
router.post('/',      verificarToken, soloAdmin, crearDetalle);
router.put('/:id',    verificarToken, soloAdmin, actualizarDetalle);
router.delete('/:id', verificarToken, soloAdmin, eliminarDetalle);

module.exports = router;