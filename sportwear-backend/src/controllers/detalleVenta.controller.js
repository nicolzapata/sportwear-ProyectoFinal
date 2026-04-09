// src/controllers/detalleVenta.controller.js
const detalleVentaService = require('../services/detalleVenta.service');

const getDetalles = async (req, res) => {
  try {
    const data = await detalleVentaService.getDetalles(req.query.id_venta);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getDetalleById = async (req, res) => {
  try {
    const data = await detalleVentaService.getDetalleById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearDetalle = async (req, res) => {
  try {
    const data = await detalleVentaService.crearDetalle(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarDetalle = async (req, res) => {
  try {
    const data = await detalleVentaService.actualizarDetalle(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const eliminarDetalle = async (req, res) => {
  try {
    await detalleVentaService.eliminarDetalle(req.params.id);
    res.json({ ok: true, message: 'Item eliminado' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getDetalles, getDetalleById, crearDetalle, actualizarDetalle, eliminarDetalle };