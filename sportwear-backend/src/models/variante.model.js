// src/models/variante.model.js
const pool = require('../config/db');

const getVariantesByProducto = async (id_producto) => {
  const result = await pool.query(`
    SELECT
      v.id_variante, v.id_producto, v.id_color,
      v.talla, v.stock, v.estado, v.fecha_creacion,
      c.nombre     AS color_nombre,
      c.codigo_hex AS codigo_hex
    FROM "ProductoVariantes" v
    JOIN "Colores" c ON v.id_color = c.id_color
    WHERE v.id_producto = $1
    ORDER BY v.talla, c.nombre
  `, [id_producto]);
  return result.rows;
};

const crearVariante = async (datos) => {
  const { id_producto, id_color, talla, stock, estado } = datos;
  const result = await pool.query(`
    INSERT INTO "ProductoVariantes" (id_producto, id_color, talla, stock, estado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [id_producto, id_color, talla, stock ?? 0, estado ?? 'Activo']);
  return result.rows[0];
};

const actualizarVariante = async (id_variante, datos) => {
  const { id_color, talla, stock, estado } = datos;
  const result = await pool.query(`
    UPDATE "ProductoVariantes" SET
      id_color = COALESCE($1::INTEGER, id_color),
      talla    = COALESCE($2::VARCHAR, talla),
      stock    = COALESCE($3::INTEGER, stock),
      estado   = COALESCE($4::VARCHAR, estado)
    WHERE id_variante = $5
    RETURNING *
  `, [id_color || null, talla || null, stock ?? null, estado || null, id_variante]);
  if (!result.rows[0]) throw { status: 404, message: 'Variante no encontrada' };
  return result.rows[0];
};

const eliminarVariante = async (id_variante) => {
  const result = await pool.query(`
    DELETE FROM "ProductoVariantes"
    WHERE id_variante = $1 RETURNING id_variante
  `, [id_variante]);
  if (!result.rows[0]) throw { status: 404, message: 'Variante no encontrada' };
  return result.rows[0];
};

module.exports = { getVariantesByProducto, crearVariante, actualizarVariante, eliminarVariante };