// src/services/categorias.service.js
const pool = require('../config/db');

const getCategorias = async () => {
  const result = await pool.query(
    `SELECT id_categoria, nombre, estado, icono
     FROM "Categorias" ORDER BY nombre`
  );
  return result.rows;
};

const crearCategoria = async ({ nombre, icono }) => {
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };
  const result = await pool.query(
    `INSERT INTO "Categorias" (nombre, icono) VALUES ($1, $2) RETURNING *`,
    [nombre, icono || 'tag']
  );
  return result.rows[0];
};

const actualizarCategoria = async (id, { nombre, estado, icono }) => {
  const result = await pool.query(
    `UPDATE "Categorias"
     SET nombre      = COALESCE($1, nombre),
         estado      = COALESCE($2, estado),
         icono       = COALESCE($3, icono)
     WHERE id_categoria = $4 RETURNING *`,
    [nombre, estado, icono, id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrada' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(
    `UPDATE "Categorias"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_categoria = $1 RETURNING id_categoria, estado`,
    [id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrada' };
  return result.rows[0];
};

module.exports = { getCategorias, crearCategoria, actualizarCategoria, toggleEstado };