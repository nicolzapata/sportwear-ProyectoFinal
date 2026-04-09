// src/services/auth.service.js
const pool = require('../config/db');
const jwt  = require('jsonwebtoken');

const generarToken = (usuario) => {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre:     usuario.nombre,
      email:      usuario.email,
      rol:        usuario.rol,
      id_cliente: usuario.id_cliente || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

const login = async ({ email, contrasena }) => {
  const baseResult = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, u.estado,
            u.intentos_fallidos, u.bloqueado_hasta, u.id_cliente,
            r.nombre AS rol
     FROM "Usuarios" u
     INNER JOIN "Roles" r ON u.id_rol = r.id_rol
     WHERE u.email = $1`,
    [email]
  );
  const base = baseResult.rows[0];
  if (!base) throw { status: 401, message: 'Credenciales incorrectas' };

  if (base.bloqueado_hasta && new Date(base.bloqueado_hasta) > new Date())
    throw { status: 403, message: 'Usuario bloqueado temporalmente. Intenta más tarde.' };

  if (base.estado !== 'Activo')
    throw { status: 403, message: 'Usuario inactivo. Contacta al administrador.' };

  const authResult = await pool.query(
    `SELECT id_usuario FROM "Usuarios"
     WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
    [email, contrasena]
  );

  if (!authResult.rows[0]) {
    await pool.query(
      `UPDATE "Usuarios" SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = $1`,
      [base.id_usuario]
    );
    throw { status: 401, message: 'Credenciales incorrectas' };
  }

  await pool.query(
    `UPDATE "Usuarios" SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id_usuario = $1`,
    [base.id_usuario]
  );

  const token = generarToken(base);
  return {
    token,
    usuario: {
      id_usuario: base.id_usuario,
      nombre:     base.nombre,
      email:      base.email,
      rol:        base.rol,
      estado:     base.estado,
      id_cliente: base.id_cliente,
    },
  };
};

const registro = async (datos) => {
  const { nombre, email, contrasena, telefono, documento, tipo_doc, ciudad, direccion, id_barrio } = datos;
  const client = await pool.connect();
  try {
    const emailExiste = await client.query(`SELECT id_usuario FROM "Usuarios" WHERE email = $1`, [email]);
    if (emailExiste.rows.length > 0)
      throw { status: 409, message: 'El email ya está registrado' };

    const docExiste = await client.query(`SELECT id_cliente FROM "Clientes" WHERE documento = $1`, [documento]);
    if (docExiste.rows.length > 0)
      throw { status: 409, message: 'El documento ya está registrado' };

    await client.query('BEGIN');

    const nuevoCliente = await client.query(
      `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_cliente`,
      [nombre, tipo_doc || 'CC', documento, telefono || null, email, ciudad || 'Medellín', id_barrio || null, direccion || null]
    );
    const id_cliente = nuevoCliente.rows[0].id_cliente;

    const nuevoUsuario = await client.query(
      `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol, id_cliente)
       VALUES ($1, $2, crypt($3, gen_salt('bf',12)), 2, $4)
       RETURNING id_usuario, nombre, email`,
      [nombre, email, contrasena, id_cliente]
    );

    await client.query('COMMIT');

    const token = generarToken({ ...nuevoUsuario.rows[0], rol: 'Cliente', id_cliente });
    return { token, usuario: nuevoUsuario.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const crearUsuario = async ({ nombre, email, contrasena, id_rol, permiso_cuotas }) => {
  const emailExiste = await pool.query(`SELECT id_usuario FROM "Usuarios" WHERE email = $1`, [email]);
  if (emailExiste.rows.length > 0)
    throw { status: 409, message: 'El email ya está registrado' };

  const result = await pool.query(
    `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol, permiso_cuotas)
     VALUES ($1, $2, crypt($3, gen_salt('bf',12)), $4, $5)
     RETURNING id_usuario, nombre, email`,
    [nombre, email, contrasena, id_rol, permiso_cuotas !== false]
  );
  return result.rows[0];
};

const actualizarUsuario = async (id, datos, usuarioActual) => {
  const { nombre, email, id_rol, estado, contrasena, tipo_doc, documento, telefono, ciudad, id_barrio, direccion, permiso_cuotas } = datos;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const usuarioExistente = await client.query(
      `SELECT id_usuario, id_cliente FROM "Usuarios" WHERE id_usuario = $1`, [id]
    );
    if (!usuarioExistente.rows.length) throw { status: 404, message: 'Usuario no encontrado' };

    const { id_cliente } = usuarioExistente.rows[0];
    const esPropioUsuario = String(usuarioActual.id_usuario) === String(id);

    if (contrasena && esPropioUsuario) {
      await client.query(
        `UPDATE "Usuarios" SET nombre=$1, email=$2, id_rol=$3, estado=$4, permiso_cuotas=$7,
         password_hash=crypt($5, gen_salt('bf',12)) WHERE id_usuario=$6`,
        [nombre, email, id_rol, estado, contrasena, id, permiso_cuotas !== false]
      );
    } else {
      await client.query(
        `UPDATE "Usuarios" SET nombre=$1, email=$2, id_rol=$3, estado=$4, permiso_cuotas=$5 WHERE id_usuario=$6`,
        [nombre, email, id_rol, estado, permiso_cuotas !== false, id]
      );
    }

    if (id_cliente) {
      await client.query(
        `UPDATE "Clientes" SET nombre=$1, tipo_doc=$2, documento=$3, telefono=$4,
         ciudad=$5, id_barrio=$6, direccion=$7 WHERE id_cliente=$8`,
        [nombre, tipo_doc || 'CC', documento || null, telefono || null,
         ciudad || 'Medellín', id_barrio || null, direccion || null, id_cliente]
      );
    } else if (documento) {
      const nuevoCliente = await client.query(
        `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_cliente`,
        [nombre, tipo_doc || 'CC', documento, telefono || null, email,
         ciudad || 'Medellín', id_barrio || null, direccion || null]
      );
      await client.query(
        `UPDATE "Usuarios" SET id_cliente=$1 WHERE id_usuario=$2`,
        [nuevoCliente.rows[0].id_cliente, id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getPerfil = async (id_usuario) => {
  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.email, u.estado,
            u.ultimo_acceso, u.fecha_creacion, u.id_cliente,
            r.nombre AS rol
     FROM "Usuarios" u
     JOIN "Roles" r ON u.id_rol = r.id_rol
     WHERE u.id_usuario = $1`,
    [id_usuario]
  );
  if (!result.rows.length) throw { status: 404, message: 'Usuario no encontrado' };
  return result.rows[0];
};

module.exports = { login, registro, crearUsuario, actualizarUsuario, getPerfil };