// src/services/barrios.service.js
const pool = require('../config/db');

const getBarrios = async () => {
  const result = await pool.query(
    `SELECT id_barrio, nombre, zona
     FROM "Barrios"
     ORDER BY nombre`
  );
  return result.rows;
};

const getZonas = async () => {
  const result = await pool.query(
    `SELECT DISTINCT zona FROM "Barrios" WHERE zona IS NOT NULL ORDER BY zona`
  );
  return result.rows.map(r => r.zona);
};

module.exports = { getBarrios, getZonas };