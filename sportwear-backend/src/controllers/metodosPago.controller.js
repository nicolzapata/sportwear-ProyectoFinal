// src/controllers/metodosPago.controller.js
const metodosPagoService = require('../services/metodosPago.service');

const getMetodosPago = async (req, res) => {
  try {
    const data = await metodosPagoService.getMetodosPago(req.query.activos === '1');
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearMetodoPago = async (req, res) => {
  try {
    const data = await metodosPagoService.crearMetodoPago(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarMetodoPago = async (req, res) => {
  try {
    const data = await metodosPagoService.actualizarMetodoPago(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await metodosPagoService.toggleEstado(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getMetodosPago, crearMetodoPago, actualizarMetodoPago, toggleEstado };
