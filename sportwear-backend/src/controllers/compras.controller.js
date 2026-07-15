// src/controllers/compras.controller.js
const comprasService = require('../services/compras.service');

const getCompras = async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const data = await comprasService.getCompras({ page, limit, q });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getCompraById = async (req, res) => {
  try {
    const data = await comprasService.getCompraById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearCompra = async (req, res) => {
  try {
    const data = await comprasService.crearCompra(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarCompra = async (req, res) => {
  try {
    const data = await comprasService.actualizarCompra(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const data = await comprasService.cambiarEstado(req.params.id, req.body.estado);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const anularCompra = async (req, res) => {
  try {
    const data = await comprasService.cambiarEstado(req.params.id, 'Anulado');
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getCompras, getCompraById, crearCompra, actualizarCompra, cambiarEstado, anularCompra };