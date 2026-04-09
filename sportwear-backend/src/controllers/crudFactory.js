// src/controllers/crudFactory.js
// Genera controladores CRUD genéricos para cada módulo
const pool = require("../config/db");

const makeController = (tabla, campos, pkField = `id_${tabla.toLowerCase()}`) => {

  const getAll = async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM "${tabla}" ORDER BY 1 DESC`
      );
      res.json(result.rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  const getOne = async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM "${tabla}" WHERE "${pkField}" = $1`,
        [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  const create = async (req, res) => {
    try {
      const valores = campos.map(c => req.body[c]);
      const cols    = campos.map(c => `"${c}"`).join(", ");
      const params  = campos.map((_, i) => `$${i + 1}`).join(", ");

      const result = await pool.query(
        `INSERT INTO "${tabla}" (${cols}) VALUES (${params}) RETURNING *`,
        valores
      );
      res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  const update = async (req, res) => {
    try {
      const valores = campos.map(c => req.body[c]);
      const sets    = campos.map((c, i) => `"${c}" = $${i + 1}`).join(", ");

      const result = await pool.query(
        `UPDATE "${tabla}" SET ${sets} WHERE "${pkField}" = $${campos.length + 1} RETURNING *`,
        [...valores, req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  const cambiarEstado = async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE "${tabla}"
         SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
         WHERE "${pkField}" = $1
         RETURNING *`,
        [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  };

  return { getAll, getOne, create, update, cambiarEstado };
};

module.exports = makeController;