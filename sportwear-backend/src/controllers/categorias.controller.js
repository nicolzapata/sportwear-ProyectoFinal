// src/controllers/categorias.controller.js
const categoriasService = require('../services/categorias.service');

const getCategorias = async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const data = await categoriasService.getCategorias({ page, limit, q });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getCategoriaById = async (req, res) => {
  try {
    const data = await categoriasService.getCategoriaById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const data = await categoriasService.crearCategoria(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    const data = await categoriasService.actualizarCategoria(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await categoriasService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getCategorias, getCategoriaById, crearCategoria, actualizarCategoria, toggleEstado };