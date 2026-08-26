// src/controllers/pagos.controller.js
const pagosService = require('../services/pagos.service');

const getPagos = async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const data = await pagosService.getPagos({ page, limit, q });
    res.json(data);
  } catch (err) {
    console.error('ERROR getPagos:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPagoById = async (req, res) => {
  try {
    const data = await pagosService.getPagoById(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('ERROR getPagoById:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPagosPorVenta = async (req, res) => {
  try {
    const data = await pagosService.getPagosPorVenta(req.params.id_venta);
    res.json(data);
  } catch (err) {
    console.error('ERROR getPagosPorVenta:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearPago = async (req, res) => {
  try {
    const data = await pagosService.crearPago(req.body);
    res.status(201).json(data);
  } catch (err) {
    console.error('ERROR crearPago:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const data = await pagosService.cambiarEstado(req.params.id, req.body.estado);
    res.json(data);
  } catch (err) {
    console.error('ERROR cambiarEstado (pagos):', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const pagarCuota = async (req, res) => {
  try {
    const data = await pagosService.pagarCuota(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    console.error('ERROR pagarCuota:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const pagarTotal = async (req, res) => {
  try {
    const data = await pagosService.pagarTotal(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    console.error('ERROR pagarTotal:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getPagos, getPagoById, getPagosPorVenta, crearPago, cambiarEstado, pagarCuota, pagarTotal };