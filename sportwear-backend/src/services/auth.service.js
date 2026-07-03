// src/services/auth.service.js
const pool       = require('../config/db');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

const generarToken = (usuario) => {
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre:     usuario.nombre,
      email:      usuario.email,
      rol:        usuario.rol,
      modulos:    Array.isArray(usuario.modulos) ? usuario.modulos : [],
      permisos:   Array.isArray(usuario.permisos) ? usuario.permisos : [],
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
    const MAX_INTENTOS = 5;
    const intentos = await pool.query(
      `UPDATE "Usuarios" SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = $1 RETURNING intentos_fallidos`,
      [base.id_usuario]
    );
    if (intentos.rows[0].intentos_fallidos >= MAX_INTENTOS) {
      await pool.query(
        `UPDATE "Usuarios" SET bloqueado_hasta = NOW() + INTERVAL '15 minutes' WHERE id_usuario = $1`,
        [base.id_usuario]
      );
      throw { status: 403, message: 'Usuario bloqueado temporalmente por múltiples intentos fallidos. Intenta en 15 minutos.' };
    }
    throw { status: 401, message: 'Credenciales incorrectas' };
  }

  await pool.query(
    `UPDATE "Usuarios" SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id_usuario = $1`,
    [base.id_usuario]
  );

  // Trae módulo + acción de cada permiso activo del rol
  const permisosResult = await pool.query(
    `SELECT DISTINCT p.modulo, p.accion
     FROM "Permisos" p
     JOIN "RolesPermisos" rp ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = (SELECT id_rol FROM "Usuarios" WHERE id_usuario = $1)
       AND rp.estado = 'Activo'
       AND p.estado = 'Activo'`,
    [base.id_usuario]
  );

  // permisos: ["Usuarios.ver", "Clientes.ver", "Clientes.crear", ...]
  const permisos = permisosResult.rows
    .map(row => `${row.modulo}.${row.accion}`)
    .filter(Boolean);

  // modulos: ["Usuarios", "Clientes", ...] (para el sidebar, igual que antes)
  const modulos = [...new Set(permisosResult.rows.map(row => row.modulo).filter(Boolean))];

  const token = generarToken({ ...base, modulos, permisos });
  return {
    token,
    usuario: {
      id_usuario: base.id_usuario,
      nombre:     base.nombre,
      email:      base.email,
      rol:        base.rol,
      estado:     base.estado,
      id_cliente: base.id_cliente,
      modulos,
      permisos,
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

    const token = generarToken({ ...nuevoUsuario.rows[0], rol: 'Cliente', id_cliente, modulos: [], permisos: [] });
    return { token, usuario: nuevoUsuario.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Crea un usuario administrativo (o Cliente) desde el panel de administración.
 * Si el rol seleccionado es "Cliente", crea también el registro en "Clientes"
 * y lo vincula vía id_cliente, manteniendo ambas tablas sincronizadas.
 */
const crearUsuario = async ({
  nombre, email, contrasena, id_rol, permiso_cuotas,
  tipo_doc, documento, telefono, ciudad, id_barrio, direccion, tipo_cliente,
}) => {
  const emailExiste = await pool.query(`SELECT id_usuario FROM "Usuarios" WHERE email = $1`, [email]);
  if (emailExiste.rows.length > 0)
    throw { status: 409, message: 'El email ya está registrado' };

  const rolResult = await pool.query(`SELECT nombre FROM "Roles" WHERE id_rol = $1`, [id_rol]);
  const esCliente = rolResult.rows[0]?.nombre?.toLowerCase() === 'cliente';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let id_cliente = null;

    if (esCliente && documento) {
      const docExiste = await client.query(`SELECT id_cliente FROM "Clientes" WHERE documento = $1`, [documento]);
      if (docExiste.rows.length > 0)
        throw { status: 409, message: 'El documento ya está registrado' };

      const nuevoCliente = await client.query(
        `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion, tipo_cliente)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_cliente`,
        [
          nombre, tipo_doc || 'CC', documento, telefono || null, email,
          ciudad || 'Medellín', id_barrio || null, direccion || null,
          tipo_cliente || 'Regular',
        ]
      );
      id_cliente = nuevoCliente.rows[0].id_cliente;
    }

    const result = await client.query(
      `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol, permiso_cuotas, id_cliente)
       VALUES ($1, $2, crypt($3, gen_salt('bf',12)), $4, $5, $6)
       RETURNING id_usuario, nombre, email`,
      [nombre, email, contrasena, id_rol, permiso_cuotas !== false, id_cliente]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const actualizarUsuario = async (id, datos, usuarioActual) => {
  const { nombre, email, id_rol, estado, contrasena, tipo_doc, documento, telefono, ciudad, id_barrio, direccion, permiso_cuotas, tipo_cliente } = datos;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const usuarioExistente = await client.query(
      `SELECT id_usuario, id_cliente FROM "Usuarios" WHERE id_usuario = $1`, [id]
    );
    if (!usuarioExistente.rows.length) throw { status: 404, message: 'Usuario no encontrado' };

    const { id_cliente } = usuarioExistente.rows[0];
    const esPropioUsuario = String(usuarioActual.id_usuario) === String(id);

    // El correo del usuario y la identificación del cliente no se pueden editar
    // una vez creados (solo se fijan al registrar), por eso no aparecen en estos UPDATE.
    if (contrasena && esPropioUsuario) {
      await client.query(
        `UPDATE "Usuarios" SET nombre=$1, id_rol=$2, estado=$3, permiso_cuotas=$6,
         password_hash=crypt($4, gen_salt('bf',12)) WHERE id_usuario=$5`,
        [nombre, id_rol, estado, contrasena, id, permiso_cuotas !== false]
      );
    } else {
      await client.query(
        `UPDATE "Usuarios" SET nombre=$1, id_rol=$2, estado=$3, permiso_cuotas=$4 WHERE id_usuario=$5`,
        [nombre, id_rol, estado, permiso_cuotas !== false, id]
      );
    }

    if (id_cliente) {
      await client.query(
        `UPDATE "Clientes" SET nombre=$1, telefono=$2,
         ciudad=$3, id_barrio=$4, direccion=$5, tipo_cliente=COALESCE($7, tipo_cliente)
         WHERE id_cliente=$6`,
        [nombre, telefono || null,
         ciudad || 'Medellín', id_barrio || null, direccion || null, id_cliente, tipo_cliente || null]
      );
    } else if (documento) {
      const nuevoCliente = await client.query(
        `INSERT INTO "Clientes" (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion, tipo_cliente)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_cliente`,
        [nombre, tipo_doc || 'CC', documento, telefono || null, email,
         ciudad || 'Medellín', id_barrio || null, direccion || null, tipo_cliente || 'Regular']
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

const recuperarContrasena = async (email) => {
  const result = await pool.query(
    `SELECT id_usuario FROM "Usuarios" WHERE email = $1`,
    [email]
  );
  const usuario = result.rows[0];
  // No revelar si el correo existe o no (evita enumeración de cuentas):
  // si no existe, simplemente no se envía nada y se responde igual desde el controller.
  if (!usuario) return;

  const token  = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 3600 * 1000); // 1 hora

  await pool.query(
    `UPDATE "Usuarios" SET reset_token = $1, reset_token_expira = $2 WHERE id_usuario = $3`,
    [token, expira, usuario.id_usuario]
  );

  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const enlace = `${process.env.FRONTEND_URL}/restablecer-contrasena?token=${token}`;

  await transporter.sendMail({
    from:    `"DVNA SportWear" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Recuperación de contraseña — DVNA SportWear',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#b49780">DVNA SportWear</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón para continuar. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${enlace}"
           style="display:inline-block;padding:12px 24px;background:#b49780;color:#fff;
                  border-radius:6px;text-decoration:none;margin:16px 0">
          Restablecer contraseña
        </a>
        <p style="color:#999;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
      </div>
    `,
  });
};

const restablecerContrasena = async (token, contrasena) => {
  const result = await pool.query(
    `SELECT id_usuario, reset_token_expira FROM "Usuarios" WHERE reset_token = $1`,
    [token]
  );
  const usuario = result.rows[0];
  if (!usuario) throw { status: 400, message: 'Token inválido o expirado.' };

  if (new Date(usuario.reset_token_expira) < new Date())
    throw { status: 400, message: 'El enlace ha expirado. Solicita uno nuevo.' };

  await pool.query(
    `UPDATE "Usuarios"
     SET password_hash       = crypt($1, gen_salt('bf',12)),
         reset_token         = NULL,
         reset_token_expira  = NULL
     WHERE id_usuario = $2`,
    [contrasena, usuario.id_usuario]
  );
};

module.exports = { login, registro, crearUsuario, actualizarUsuario, getPerfil, recuperarContrasena, restablecerContrasena };