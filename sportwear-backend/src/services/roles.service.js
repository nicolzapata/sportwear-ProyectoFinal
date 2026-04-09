// src/services/roles.service.js
const rolModel = require('../models/rol.model');

const getRoles = async (rol) => {
  if (rol === 'Admin') return await rolModel.findAll();
  return await rolModel.findActivos();
};

const getRolById = async (id, rol) => {
  if (rol === 'Admin') {
    const rolConPermisos = await rolModel.findConPermisos(id);
    if (!rolConPermisos) throw { status: 404, message: 'Rol no encontrado.' };
    return rolConPermisos;
  }
  const rolData = await rolModel.findById(id);
  if (!rolData) throw { status: 404, message: 'Rol no encontrado.' };
  return rolData;
};

module.exports = { getRoles, getRolById };