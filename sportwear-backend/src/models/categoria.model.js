// src/models/categoria.model.js
// Tabla: Categorias
// PK: id_categoria
// Columnas: id_categoria, nombre, estado, fecha_creacion

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class CategoriaModel extends BaseModel {
  constructor() {
    super('Categorias', 'id_categoria');
  }

  async findActivas() {
    const result = await pool.query(
      `SELECT id_categoria, nombre, estado
       FROM "Categorias" WHERE estado = 'Activo' ORDER BY nombre ASC`
    );
    return result.rows;
  }
}

module.exports = new CategoriaModel();
