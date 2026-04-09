// src/models/producto.model.js
// Tabla: Productos
// PK: id_producto
// Columnas: id_producto, nombre, descripcion, id_categoria, id_color,
//           precio, talla, publicado, estado, fecha_creacion, stock

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ProductoModel extends BaseModel {
  constructor() {
    super('Productos', 'id_producto');
  }

  async findAllCompleto(soloPublicados = false) {
    const where = soloPublicados ? `WHERE p.publicado = true AND p.estado = 'Activo'` : '';
    const result = await pool.query(
      `SELECT
         p.*,
         c.nombre       AS categoria,
         col.nombre     AS color_nombre,
         col.codigo_hex,
         (SELECT url FROM "Imagenes"
          WHERE id_referencia = p.id_producto
            AND tipo_referencia = 'Producto'
            AND es_principal = true
            AND estado = 'Activo'
          LIMIT 1)      AS imagen_principal
       FROM "Productos" p
       LEFT JOIN "Categorias" c   ON p.id_categoria = c.id_categoria
       LEFT JOIN "Colores"    col ON p.id_color     = col.id_color
       ${where}
       ORDER BY p.fecha_creacion DESC`
    );
    return result.rows;
  }

  async findByIdCompleto(id) {
    const result = await pool.query(
      `SELECT
         p.*,
         c.nombre       AS categoria,
         col.nombre     AS color_nombre,
         col.codigo_hex
       FROM "Productos" p
       LEFT JOIN "Categorias" c   ON p.id_categoria = c.id_categoria
       LEFT JOIN "Colores"    col ON p.id_color     = col.id_color
       WHERE p.id_producto = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async togglePublicar(id) {
    const result = await pool.query(
      `UPDATE "Productos" SET publicado = NOT publicado
       WHERE id_producto = $1 RETURNING id_producto, publicado`,
      [id]
    );
    return result.rows[0] || null;
  }

  async actualizarStock(id, cantidad, client = pool) {
    const result = await client.query(
      `UPDATE "Productos" SET stock = stock + $1
       WHERE id_producto = $2 RETURNING id_producto, stock`,
      [cantidad, id]
    );
    return result.rows[0] || null;
  }

  async findBajoStock(limite = 5) {
    const result = await pool.query(
      `SELECT * FROM "Productos"
       WHERE stock < $1 AND estado = 'Activo'
       ORDER BY stock ASC`,
      [limite]
    );
    return result.rows;
  }
}

module.exports = new ProductoModel();
