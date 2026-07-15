// src/controllers/pedidos.controller.js
const pedidosService = require('../services/pedidos.service');

const getPedidos = async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const data = await pedidosService.getPedidos({ page, limit, q });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPedidoById = async (req, res) => {
  try {
    const data = await pedidosService.getPedidoById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getHistorialPedido = async (req, res) => {
  try {
    const data = await pedidosService.getHistorial(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const id_usuario = req.usuario?.id_usuario;
    const data = await pedidosService.cambiarEstadoPedido(req.params.id, req.body.estado, id_usuario);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getPedidos, getPedidoById, getHistorialPedido, cambiarEstado };