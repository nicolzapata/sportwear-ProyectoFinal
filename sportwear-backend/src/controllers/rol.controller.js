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

module.exports = { getRoles, getRolById };