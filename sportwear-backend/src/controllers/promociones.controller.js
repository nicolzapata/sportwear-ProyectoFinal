// src/controllers/promociones.controller.js
const promocionesService = require('../services/promociones.service');

const getPromociones = async (req, res) => {
  try {
    const data = await promocionesService.getPromociones();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPromocionById = async (req, res) => {
  try {
    const data = await promocionesService.getPromocionById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPromocionesActivas = async (req, res) => {
  try {
    const data = await promocionesService.getPromocionesActivas();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getPromocionesVigentes = async (req, res) => {
  try {
    const data = await promocionesService.getPromocionesVigentes();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearPromocion = async (req, res) => {
  try {
    const data = await promocionesService.crearPromocion(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarPromocion = async (req, res) => {
  try {
    const data = await promocionesService.actualizarPromocion(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await promocionesService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getPromociones, getPromocionById, getPromocionesActivas, getPromocionesVigentes, crearPromocion, actualizarPromocion, toggleEstado };