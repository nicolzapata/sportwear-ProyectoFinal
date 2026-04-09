// src/controllers/colores.controller.js
const coloresService = require('../services/colores.service');

const getColores = async (req, res) => {
  try {
    const data = await coloresService.getColores();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearColor = async (req, res) => {
  try {
    const data = await coloresService.crearColor(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarColor = async (req, res) => {
  try {
    const data = await coloresService.actualizarColor(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await coloresService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getColores, crearColor, actualizarColor, toggleEstado };