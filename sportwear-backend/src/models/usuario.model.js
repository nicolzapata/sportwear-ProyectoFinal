// src/models/usuario.model.js
// Tabla: Usuarios
// PK: id_usuario
// Columnas: id_usuario, nombre, email, password_hash, id_rol,
//           ultimo_acceso, intentos_fallidos, bloqueado_hasta,
//           estado, fecha_creacion, id_cliente

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class UsuarioModel extends BaseModel {
  constructor() {
    super('Usuarios', 'id_usuario');
  }

  // Busca usuario con su rol incluido
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, r.nombre AS rol, r.nivel
       FROM "Usuarios" u
       JOIN "Roles" r ON u.id_rol = r.id_rol
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  // Verifica contraseña usando pgcrypto
  async verificarPassword(email, contrasena) {
    const result = await pool.query(
      `SELECT id_usuario FROM "Usuarios"
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, contrasena]
    );
    return result.rows[0] || null;
  }

  // Incrementa intentos fallidos
  async incrementarIntentos(id_usuario) {
    return await pool.query(
      `UPDATE "Usuarios" SET intentos_fallidos = intentos_fallidos + 1
       WHERE id_usuario = $1 RETURNING intentos_fallidos`,
      [id_usuario]
    );
  }

  // Resetea intentos y registra último acceso
  async loginExitoso(id_usuario) {
    return await pool.query(
      `UPDATE "Usuarios"
       SET intentos_fallidos = 0, ultimo_acceso = NOW()
       WHERE id_usuario = $1`,
      [id_usuario]
    );
  }

  // Bloquea usuario hasta una fecha
  async bloquear(id_usuario, hasta) {
    return await pool.query(
      `UPDATE "Usuarios" SET bloqueado_hasta = $1 WHERE id_usuario = $2`,
      [hasta, id_usuario]
    );
  }

  // Lista todos los usuarios con su rol
  async findAllConRol({ page, limit, q } = {}) {
    const params = [];
    let busquedaSql = '';
    if (q) {
      params.push(`%${q}%`);
      busquedaSql = `WHERE (u.nombre ILIKE $${params.length} OR u.email ILIKE $${params.length} OR CAST(u.id_usuario AS TEXT) = $${params.length + 1})`;
      params.push(q);
    }

    const paginar = page !== undefined;
    let limitOffsetSql = '';
    if (paginar) {
      const pagina = Math.max(parseInt(page) || 1, 1);
      const limite = Math.max(parseInt(limit) || 10, 1);
      const offset = (pagina - 1) * limite;
      params.push(limite, offset);
      limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.estado,
              u.ultimo_acceso, u.intentos_fallidos, u.fecha_creacion,
              r.nombre AS rol, r.id_rol
              ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
       FROM "Usuarios" u
       JOIN "Roles" r ON u.id_rol = r.id_rol
       ${busquedaSql}
       ORDER BY u.id_usuario DESC
       ${limitOffsetSql}`,
      params
    );

    if (!paginar) return result.rows;
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
    const data = result.rows.map(({ total_count, ...r }) => r);
    return { data, total };
  }
}

module.exports = new UsuarioModel();
