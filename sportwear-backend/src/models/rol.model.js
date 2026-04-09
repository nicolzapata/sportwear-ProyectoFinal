// src/models/rol.model.js
// Tabla: Roles
// PK: id_rol
// Columnas: id_rol, nombre, descripcion, nivel, estado, fecha_creacion

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class RolModel extends BaseModel {
  constructor() {
    super('Roles', 'id_rol');
  }

  // Trae rol con sus permisos asignados
  async findConPermisos(id_rol) {
    const result = await pool.query(
      `SELECT r.*, array_agg(p.nombre) AS permisos
       FROM "Roles" r
       LEFT JOIN "RolesPermisos" rp ON r.id_rol = rp.id_rol AND rp.estado = 'Activo'
       LEFT JOIN "Permisos" p ON rp.id_permiso = p.id_permiso
       WHERE r.id_rol = $1
       GROUP BY r.id_rol`,
      [id_rol]
    );
    return result.rows[0] || null;
  }

  async findActivos() {
    const result = await pool.query(
      `SELECT * FROM "Roles" WHERE estado = 'Activo' ORDER BY nivel ASC`
    );
    return result.rows;
  }
}

module.exports = new RolModel();
