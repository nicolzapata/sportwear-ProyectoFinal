// src/controllers/usuario.controller.js
const usuariosService = require('../services/usuarios.service');

const listar = async (req, res) => {
  try {
    const data = await usuariosService.listar();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al obtener usuarios' });
  }
};

const obtener = async (req, res) => {
  try {
    const data = await usuariosService.obtener(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al obtener usuario' });
  }
};

const crear = async (req, res) => {
  try {
    const data = await usuariosService.crear(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al crear usuario' });
  }
};

const actualizar = async (req, res) => {
  try {
    const data = await usuariosService.actualizar(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al actualizar usuario' });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    await usuariosService.cambiarPassword(req.params.id, req.body);
    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al cambiar contraseña' });
  }
};

const eliminar = async (req, res) => {
  try {
    await usuariosService.eliminar(req.params.id);
    res.json({ ok: true, mensaje: 'Usuario desactivado correctamente' });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al eliminar usuario' });
  }
};

const login = async (req, res) => {
  try {
    const data = await usuariosService.login(req.body);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error en el proceso de autenticación' });
  }
};

const desbloquear = async (req, res) => {
  try {
    await usuariosService.desbloquear(req.params.id);
    res.json({ ok: true, mensaje: 'Usuario desbloqueado correctamente' });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error al desbloquear usuario' });
  }
};

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, eliminar, login, desbloquear };