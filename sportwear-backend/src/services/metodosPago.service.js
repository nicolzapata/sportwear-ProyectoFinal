// src/services/metodosPago.service.js
const pool = require('../config/db');

const getMetodosPago = async (soloActivos = false) => {
  const where = soloActivos ? `WHERE estado = 'Activo'` : '';
  const result = await pool.query(
    `SELECT id_metodo, nombre, estado FROM "MetodosPago" ${where} ORDER BY nombre`
  );
  return result.rows;
};

const crearMetodoPago = async ({ nombre }) => {
  if (!nombre || !nombre.trim()) throw { status: 400, message: 'El nombre del método es requerido' };
  const result = await pool.query(
    `INSERT INTO "MetodosPago" (nombre) VALUES ($1) RETURNING *`,
    [nombre.trim()]
  );
  return result.rows[0];
};

const actualizarMetodoPago = async (id, { nombre, estado }) => {
  const result = await pool.query(
    `UPDATE "MetodosPago"
     SET nombre = COALESCE($1, nombre),
         estado = COALESCE($2, estado)
     WHERE id_metodo = $3 RETURNING *`,
    [nombre, estado, id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(
    `UPDATE "MetodosPago"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_metodo = $1 RETURNING id_metodo, estado`,
    [id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getMetodosPago, crearMetodoPago, actualizarMetodoPago, toggleEstado };
