// src/models/modulo.model.js
// Tabla: Modulos
// PK: id_modulo
// Columnas: id_modulo, nombre, icono, ruta_base, orden, estado, fecha_creacion

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ModuloModel extends BaseModel {
  constructor() {
    super('Modulos', 'id_modulo');
  }

  async findActivos() {
    const result = await pool.query(
      `SELECT * FROM "Modulos" WHERE estado = 'Activo' ORDER BY orden ASC`
    );
    return result.rows;
  }
}

module.exports = new ModuloModel();
