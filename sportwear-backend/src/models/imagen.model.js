// src/models/imagen.model.js
const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ImagenModel extends BaseModel {
  constructor() {
    super('Imagenes', 'id_imagen');
  }

  // Todas las imágenes de una referencia.
  // Si se pasa id_color: primero las de ese color, luego las generales (sin color).
  async findByReferencia(tipo_referencia, id_referencia, id_color = null) {
    if (id_color) {
      const result = await pool.query(
        `SELECT * FROM "Imagenes"
         WHERE tipo_referencia = $1 AND id_referencia = $2
           AND (id_color = $3 OR id_color IS NULL)
           AND estado = 'Activo'
         ORDER BY
           CASE WHEN id_color = $3 THEN 0 ELSE 1 END,
           orden ASC, id_imagen ASC`,
        [tipo_referencia, id_referencia, id_color]
      );
      return result.rows;
    }
    const result = await pool.query(
      `SELECT * FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2
       ORDER BY orden ASC, id_imagen ASC`,
      [tipo_referencia, id_referencia]
    );
    return result.rows;
  }

  async findPrincipal(tipo_referencia, id_referencia) {
    const result = await pool.query(
      `SELECT * FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2
         AND es_principal = true AND estado = 'Activo'
       LIMIT 1`,
      [tipo_referencia, id_referencia]
    );
    return result.rows[0] || null;
  }

  // Imagen principal para un color específico;
  // si no existe, cae a la imagen principal general.
  async findPrincipalPorColor(tipo_referencia, id_referencia, id_color) {
    const result = await pool.query(
      `SELECT * FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2
         AND estado = 'Activo'
         AND (id_color = $3 OR id_color IS NULL)
       ORDER BY
         CASE WHEN id_color = $3 THEN 0 ELSE 1 END,
         CASE WHEN es_principal THEN 0 ELSE 1 END,
         orden ASC
       LIMIT 1`,
      [tipo_referencia, id_referencia, id_color]
    );
    return result.rows[0] || null;
  }

  async setPrincipal(id_imagen, tipo_referencia, id_referencia) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE "Imagenes" SET es_principal = FALSE
         WHERE tipo_referencia = $1 AND id_referencia = $2`,
        [tipo_referencia, id_referencia]
      );
      const result = await client.query(
        `UPDATE "Imagenes" SET es_principal = TRUE
         WHERE id_imagen = $1 RETURNING *`,
        [id_imagen]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async setColor(id_imagen, id_color) {
    const result = await pool.query(
      `UPDATE "Imagenes" SET id_color = $1 WHERE id_imagen = $2 RETURNING *`,
      [id_color ?? null, id_imagen]
    );
    return result.rows[0] || null;
  }

  async siguientePrincipal(tipo_referencia, id_referencia) {
    await pool.query(
      `UPDATE "Imagenes" SET es_principal = TRUE
       WHERE id_imagen = (
         SELECT id_imagen FROM "Imagenes"
         WHERE tipo_referencia = $1 AND id_referencia = $2
         ORDER BY orden ASC LIMIT 1
       )`,
      [tipo_referencia, id_referencia]
    );
  }
}

module.exports = new ImagenModel();