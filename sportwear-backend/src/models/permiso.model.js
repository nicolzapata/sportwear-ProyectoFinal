// src/models/permiso.model.js
// Tabla: Permisos
// PK: id_permiso
// Columnas: id_permiso, nombre, descripcion, modulo, accion, estado, fecha_creacion
// FK: modulo → Modulos(nombre)

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class PermisoModel extends BaseModel {
  constructor() {
    super('Permisos', 'id_permiso');
  }

  async findByModulo(modulo) {
    const result = await pool.query(
      `SELECT * FROM "Permisos"
       WHERE modulo = $1 AND estado = 'Activo'
       ORDER BY accion ASC`,
      [modulo]
    );
    return result.rows;
  }

  async findByRol(id_rol) {
    const result = await pool.query(
      `SELECT p.*
       FROM "Permisos" p
       JOIN "RolesPermisos" rp ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = $1 AND rp.estado = 'Activo' AND p.estado = 'Activo'
       ORDER BY p.modulo, p.accion`,
      [id_rol]
    );
    return result.rows;
  }
}

module.exports = new PermisoModel();
