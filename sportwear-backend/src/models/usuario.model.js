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
  async findAllConRol() {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.estado,
              u.ultimo_acceso, u.intentos_fallidos, u.fecha_creacion,
              r.nombre AS rol, r.id_rol
       FROM "Usuarios" u
       JOIN "Roles" r ON u.id_rol = r.id_rol
       ORDER BY u.id_usuario DESC`
    );
    return result.rows;
  }
}

module.exports = new UsuarioModel();
