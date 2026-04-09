// src/controllers/detalleCompra.controller.js
const detalleCompraService = require('../services/detalleCompra.service');

const getDetalles = async (req, res) => {
  try {
    const data = await detalleCompraService.getDetalles(req.query.id_compra);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getDetalleById = async (req, res) => {
  try {
    const data = await detalleCompraService.getDetalleById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearDetalle = async (req, res) => {
  try {
    const data = await detalleCompraService.crearDetalle(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarDetalle = async (req, res) => {
  try {
    const data = await detalleCompraService.actualizarDetalle(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const eliminarDetalle = async (req, res) => {
  try {
    await detalleCompraService.eliminarDetalle(req.params.id);
    res.json({ ok: true, message: 'Item eliminado' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getDetalles, getDetalleById, crearDetalle, actualizarDetalle, eliminarDetalle };