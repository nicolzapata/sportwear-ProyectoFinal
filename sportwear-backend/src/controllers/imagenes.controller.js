// src/controllers/imagenes.controller.js
const imagenesService = require('../services/imagenes.service');

const getImagenesByReferencia = async (req, res) => {
  try {
    const { tipo_referencia, id_referencia } = req.query;
    const data = await imagenesService.getImagenesByReferencia(tipo_referencia, id_referencia);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getImagenPrincipal = async (req, res) => {
  try {
    const { tipo_referencia, id_referencia } = req.query;
    const data = await imagenesService.getImagenPrincipal(tipo_referencia, id_referencia);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getImagenById = async (req, res) => {
  try {
    const data = await imagenesService.getImagenById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearImagen = async (req, res) => {
  try {
    const data = await imagenesService.crearImagen(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const setPrincipal = async (req, res) => {
  try {
    const { tipo_referencia, id_referencia } = req.body;
    const data = await imagenesService.setPrincipal(req.params.id, tipo_referencia, id_referencia);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await imagenesService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const eliminarImagen = async (req, res) => {
  try {
    await imagenesService.eliminarImagen(req.params.id);
    res.json({ ok: true, message: 'Imagen eliminada' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getImagenesByReferencia, getImagenPrincipal, getImagenById, crearImagen, setPrincipal, toggleEstado, eliminarImagen };