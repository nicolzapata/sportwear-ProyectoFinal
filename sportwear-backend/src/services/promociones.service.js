// src/services/promociones.service.js
const pool = require('../config/db');
const promocionModel = require('../models/promocion.model');

const getPromociones = async () => {
  const result = await pool.query(
    `SELECT * FROM "Promociones" ORDER BY id_promocion DESC`
  );
  return result.rows;
};

const getPromocionById = async (id) => {
  const promo = await promocionModel.findById(id);
  if (!promo) throw { status: 404, message: 'Promoción no encontrada' };
  return promo;
};

const getPromocionesActivas = async () => {
  return await promocionModel.findActivas();
};

const getPromocionesVigentes = async () => {
  return await promocionModel.findVigentes();
};

const crearPromocion = async (datos) => {
  const { nombre, descripcion, tipo_descuento, descuento, fecha_inicio, fecha_fin, estado } = datos;
  if (!nombre || !descuento || !fecha_inicio || !fecha_fin)
    throw { status: 400, message: 'Nombre, descuento, fecha_inicio y fecha_fin son requeridos' };

  const result = await pool.query(
    `INSERT INTO "Promociones" (nombre, descripcion, tipo_descuento, descuento, fecha_inicio, fecha_fin, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [nombre, descripcion || null, tipo_descuento || 'Porcentaje',
     descuento, fecha_inicio, fecha_fin, estado || 'Activo']
  );
  return result.rows[0];
};

const actualizarPromocion = async (id, datos) => {
  const { nombre, descripcion, tipo_descuento, descuento, fecha_inicio, fecha_fin, estado } = datos;
  const result = await pool.query(
    `UPDATE "Promociones" SET
       nombre        = COALESCE($1, nombre),
       descripcion   = COALESCE($2, descripcion),
       tipo_descuento= COALESCE($3, tipo_descuento),
       descuento     = COALESCE($4, descuento),
       fecha_inicio  = COALESCE($5, fecha_inicio),
       fecha_fin     = COALESCE($6, fecha_fin),
       estado        = COALESCE($7, estado)
     WHERE id_promocion = $8 RETURNING *`,
    [nombre, descripcion, tipo_descuento, descuento, fecha_inicio, fecha_fin, estado, id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'Promoción no encontrada' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(
    `UPDATE "Promociones"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_promocion = $1 RETURNING id_promocion, estado`,
    [id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'Promoción no encontrada' };
  return result.rows[0];
};

module.exports = { getPromociones, getPromocionById, getPromocionesActivas, getPromocionesVigentes, crearPromocion, actualizarPromocion, toggleEstado };