// src/controllers/ventas.controller.js
const ventasService = require('../services/ventas.service');
const { generarComprobanteVentaPDF } = require('../services/pdf.service');

const getVentas = async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const data = await ventasService.getVentas({ page, limit, q });
    res.json(data);
  } catch (err) {
    console.error('ERROR getVentas:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getVentaById = async (req, res) => {
  try {
    const data = await ventasService.getVentaById(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('ERROR getVentaById:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearVenta = async (req, res) => {
  try {
    const data = await ventasService.crearVenta(req.body);
    res.status(201).json(data);
  } catch (err) {
    console.error('ERROR crearVenta:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const data = await ventasService.cambiarEstado(req.params.id, req.body.estado);
    res.json(data);
  } catch (err) {
    console.error('ERROR cambiarEstado (ventas):', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ✅ NUEVO: controlador para que el cliente cree su propio pedido
const crearMiPedido = async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente; // viene del token, nunca del body
    const data = await ventasService.crearMiPedido({ ...req.body, id_cliente });
    res.status(201).json(data);
  } catch (err) {console.error('ERROR crearMiPedido:', err);
    res.status(500).json({ 
      message: err.message, 
      detail: err.detail,   // detalle SQL
      code:   err.code,     // código de error PostgreSQL
    });
  }
};

const crearCarritoAbandonado = async (req, res) => {
  try {
    const { total, items } = req.body;
    const data = await ventasService.crearCarritoAbandonado({ total, items });
    res.status(201).json(data);
  } catch (err) {
    console.error('ERROR crearCarritoAbandonado:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getMisPedidos = async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const data = await ventasService.getMisPedidos(id_cliente);
    res.json(data);
  } catch (err) {
    console.error('Error getMisPedidos:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getComprobantePDF = async (req, res) => {
  try {
    const venta = await ventasService.getVentaById(req.params.id);
    const esAdmin = req.usuario.rol === 'Admin';
    if (!esAdmin && venta.id_cliente !== req.usuario.id_cliente) {
      return res.status(403).json({ message: 'No tienes permiso sobre este comprobante.' });
    }
    generarComprobanteVentaPDF(res, { venta, items: venta.items });
  } catch (err) {
    console.error('ERROR getComprobantePDF:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── NUEVO: cupo/deuda/disponible de un cliente, para validar ventas a cuotas ──
const getCreditoCliente = async (req, res) => {
  try {
    const data = await ventasService.getCreditoCliente(req.params.id_cliente);
    res.json(data);
  } catch (err) {
    console.error('ERROR getCreditoCliente:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getVentas, getVentaById, crearVenta, cambiarEstado, crearMiPedido, crearCarritoAbandonado, getMisPedidos, getComprobantePDF, getCreditoCliente };