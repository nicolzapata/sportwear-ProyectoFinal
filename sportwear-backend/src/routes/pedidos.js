// src/routes/pedidos.js
const router = require('express').Router();
const {
  getPedidos, getPedidoById, getHistorialPedido, cambiarEstado, editarPedido
} = require('../controllers/pedidos.controller');
const { verificarToken, tieneModulo } = require('../middlewares/auth.middleware');

router.get('/',              verificarToken, tieneModulo('Pedidos', 'ver'),    getPedidos);
router.get('/:id',           verificarToken, tieneModulo('Pedidos', 'ver'),    getPedidoById);
router.get('/:id/historial', verificarToken, tieneModulo('Pedidos', 'ver'),    getHistorialPedido);
router.patch('/:id/estado',  verificarToken, tieneModulo('Pedidos', 'estado'), cambiarEstado);
router.patch('/:id',         verificarToken, tieneModulo('Pedidos', 'editar'), editarPedido);

module.exports = router;