// src/controllers/productos.controller.js
const productosService = require('../services/productos.service');

const getProductos = async (req, res) => {
  try {
    const { publicado, id_categoria, id, q, precio_min, precio_max, talla, color, page, limit } = req.query;
    const data = await productosService.getProductos({ publicado, id_categoria, id, q, precio_min, precio_max, talla, color, page, limit });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearProducto = async (req, res) => {
  try {
    const data = await productosService.crearProducto(req.body);
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarProducto = async (req, res) => {
  try {
    const data = await productosService.actualizarProducto(req.params.id, req.body, req.usuario?.id_usuario);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getHistorialPrecios = async (req, res) => {
  try {
    const data = await productosService.getHistorialPrecios(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await productosService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const togglePublicar = async (req, res) => {
  try {
    const data = await productosService.togglePublicar(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const eliminarProducto = async (req, res) => {
  try {
    const data = await productosService.eliminarProducto(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar, eliminarProducto, getHistorialPrecios };