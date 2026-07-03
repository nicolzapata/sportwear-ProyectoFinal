// src/routes/categorias.js
const router = require('express').Router();
const {
  getCategorias, getCategoriaById, crearCategoria, actualizarCategoria, toggleEstado
} = require('../controllers/categorias.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.get('/',              getCategorias);                             // público
router.get('/:id',           verificarToken, soloAdmin, getCategoriaById);
router.post('/',             verificarToken, soloAdmin, crearCategoria);
router.put('/:id',           verificarToken, soloAdmin, actualizarCategoria);
router.patch('/:id/estado',  verificarToken, soloAdmin, toggleEstado);

module.exports = router;