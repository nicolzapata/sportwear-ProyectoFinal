// src/models/catalogo.model.js
// Tabla: Catalogo
// PK: id_catalogo
// Columnas: id_catalogo, id_producto, imagen_url, titulo, descripcion,
//           orden, es_principal, estado, fecha_creacion
// FK: id_producto → Productos(id_producto)

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class CatalogoModel extends BaseModel {
  constructor() {
    super('Catalogo', 'id_catalogo');
  }

  async findPublico() {
    const result = await pool.query(
      `SELECT
         c.id_catalogo, c.imagen_url, c.titulo,
         c.descripcion AS descripcion_catalogo,
         c.orden, c.es_principal,
         p.id_producto, p.nombre, p.descripcion,
         p.precio, p.talla, p.stock,
         cat.nombre AS categoria,
         col.nombre AS color
       FROM "Catalogo" c
       JOIN "Productos"  p   ON c.id_producto  = p.id_producto
       LEFT JOIN "Categorias" cat ON p.id_categoria = cat.id_categoria
       LEFT JOIN "Colores"    col ON p.id_color     = col.id_color
       WHERE c.estado = 'Activo' AND p.publicado = true AND p.estado = 'Activo'
       ORDER BY c.orden ASC, c.fecha_creacion DESC`
    );
    return result.rows;
  }
}

module.exports = new CatalogoModel();
