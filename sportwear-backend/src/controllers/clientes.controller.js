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
    const { page, limit, q } = req.query;
    const data = await clientesService.getClientesConVentas({ page, limit, q });
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
    const data = await clientesService.actualizarCliente(req.params.id, req.body);
    res.json(data);
  } catch (err) {
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
    // getClienteById ya trae permiso_cuotas correcto desde "Clientes" (la tabla
    // que de verdad actualiza el admin al bloquear/permitir cuotas); antes esto
    // se sobreescribía leyendo "Usuarios".permiso_cuotas, una columna que nunca
    // se actualiza, dejando el bloqueo del admin sin efecto en el checkout.
    const data = await clientesService.getClienteById(id_cliente);
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
    const { page, limit, q } = req.query;
    const data = await clientesService.getClientesRolCliente({ page, limit, q });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = {
  getClientes, getClientesConVentas, getClienteById, crearCliente,
  actualizarCliente, toggleEstado, togglePermisoCuotas,
  getMiPerfil, actualizarMiPerfil, debugClientesVentas, getClientesRolCliente,
};