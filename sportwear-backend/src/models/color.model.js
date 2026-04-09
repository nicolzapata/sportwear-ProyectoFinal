// src/models/color.model.js
// Tabla: Colores
// PK: id_color
// Columnas: id_color, nombre, codigo_hex, estado

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ColorModel extends BaseModel {
  constructor() {
    super('Colores', 'id_color');
  }

  async findActivos() {
    const result = await pool.query(
      `SELECT id_color, nombre, codigo_hex, estado
       FROM "Colores" WHERE estado = 'Activo' ORDER BY nombre ASC`
    );
    return result.rows;
  }
}

module.exports = new ColorModel();
