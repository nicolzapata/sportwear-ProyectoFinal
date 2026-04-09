// src/routes/categorias.js
const router = require('express').Router();
const {
  getCategorias, crearCategoria, actualizarCategoria, toggleEstado
} = require('../controllers/categorias.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',              getCategorias);                             // público
router.post('/',             verificarToken, soloAdmin, crearCategoria);
router.put('/:id',           verificarToken, soloAdmin, actualizarCategoria);
router.patch('/:id/estado',  verificarToken, soloAdmin, toggleEstado);

module.exports = router;