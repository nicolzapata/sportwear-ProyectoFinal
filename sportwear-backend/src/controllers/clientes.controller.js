// src/controllers/clientes.controller.js
const clientesService = require('../services/clientes.service');

const getClientes = async (req, res) => {
  try {
    const data = await clientesService.getClientes();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getClientesConVentas = async (req, res) => {
  try {
    const data = await clientesService.getClientesConVentas();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const debugClientesVentas = async (req, res) => {
  try {
    const data = await clientesService.debugClientesVentas();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getClienteById = async (req, res) => {
  try {
    const data = await clientesService.getClienteById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const crearCliente = async (req, res) => {
  try {
    const data = await clientesService.crearCliente(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    console.log('actualizarCliente called with:', req.params.id, req.body);
    const data = await clientesService.actualizarCliente(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    console.error('Error en actualizarCliente:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

const toggleEstado = async (req, res) => {
  try {
    const data = await clientesService.toggleEstado(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const togglePermisoPagos = async (req, res) => {
  try {
    const data = await clientesService.togglePermisoPagos(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const togglePermisoCuotas = async (req, res) => {
  try {
    const data = await clientesService.togglePermisoCuotas(req.params.id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getMiPerfil = async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const data = await clientesService.getClienteById(id_cliente);
    // Agregar permiso_cuotas desde la tabla Usuarios
    if (req.usuario.id_usuario) {
      const pool = require('../config/db');
      const usuarioRes = await pool.query(
        `SELECT permiso_cuotas FROM "Usuarios" WHERE id_usuario = $1`,
        [req.usuario.id_usuario]
      );
      if (usuarioRes.rows.length) {
        data.permiso_cuotas = usuarioRes.rows[0].permiso_cuotas;
      }
    }
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const actualizarMiPerfil = async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const data = await clientesService.actualizarMiPerfil(id_cliente, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getClientesRolCliente = async (req, res) => {
  try {
    const data = await clientesService.getClientesRolCliente();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas, getClientesRolCliente,
};