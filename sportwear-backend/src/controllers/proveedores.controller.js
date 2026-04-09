// src/controllers/proveedores.controller.js
const proveedoresService = require('../services/proveedores.service');

const getProveedores = async (req, res) => {
  try {
    const data = await proveedoresService.getProveedores();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getProveedorById = async (req, res) => {
  try {
    const data = await proveedoresService.getProveedorById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearProveedor = async (req, res) => {
  try {
    const data = await proveedoresService.crearProveedor(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarProveedor = async (req, res) => {
  try {
    const data = await proveedoresService.actualizarProveedor(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await proveedoresService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getProveedores, getProveedorById, crearProveedor, actualizarProveedor, toggleEstado };