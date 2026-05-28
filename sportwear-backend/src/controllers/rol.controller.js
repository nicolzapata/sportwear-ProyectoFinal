// src/controllers/rol.controller.js
const rolesService = require('../services/roles.service');

const getRoles = async (req, res) => {
  try {
    const data = await rolesService.getRoles(req.usuario.rol);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

const getRolById = async (req, res) => {
  try {
    const data = await rolesService.getRolById(req.params.id, req.usuario.rol);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

const createRol = async (req, res) => {
  try {
    const data = await rolesService.createRole(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

const updateRol = async (req, res) => {
  try {
    const data = await rolesService.updateRole(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

const changeRolEstado = async (req, res) => {
  try {
    const data = await rolesService.changeRoleState(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

const getRolPermisos = async (req, res) => {
  try {
    const data = await rolesService.getRolePermissions(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

module.exports = { getRoles, getRolById, createRol, updateRol, changeRolEstado, getRolPermisos };