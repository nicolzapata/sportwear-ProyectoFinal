// src/routes/colores.js
const router = require('express').Router();
const {
  getColores, crearColor, actualizarColor, toggleEstado
} = require('../controllers/colores.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',              getColores);                              // público
router.post('/',             verificarToken, soloAdmin, crearColor);
router.put('/:id',           verificarToken, soloAdmin, actualizarColor);
router.patch('/:id/estado',  verificarToken, soloAdmin, toggleEstado);

module.exports = router;