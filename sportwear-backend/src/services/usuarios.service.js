// src/services/usuarios.service.js
const usuarioModel = require('../models/usuario.model');
const jwt = require('jsonwebtoken');

const MAX_INTENTOS    = 5;
const BLOQUEO_MINUTOS = 30;

const listar = async () => {
  return await usuarioModel.findAllConRol();
};

const obtener = async (id) => {
  const usuario = await usuarioModel.findById(id);
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado' };
  delete usuario.password_hash;
  return usuario;
};

const crear = async ({ nombre, email, password, id_rol, id_cliente, estado = 'activo' }) => {
  if (!nombre || !email || !password || !id_rol)
    throw { status: 400, message: 'Campos requeridos: nombre, email, password, id_rol' };

  const existe = await usuarioModel.findByEmail(email);
  if (existe) throw { status: 409, message: 'El email ya está registrado' };

  const nuevo = await usuarioModel.create({
    nombre, email,
    password_hash: password,
    id_rol,
    id_cliente: id_cliente || null,
    estado,
    intentos_fallidos: 0,
    fecha_creacion: new Date()
  });
  delete nuevo.password_hash;
  return nuevo;
};

const actualizar = async (id, datos) => {
  const { nombre, email, id_rol, id_cliente, estado } = datos;

  const existe = await usuarioModel.findById(id);
  if (!existe) throw { status: 404, message: 'Usuario no encontrado' };

  if (email && email !== existe.email) {
    const emailEnUso = await usuarioModel.findByEmail(email);
    if (emailEnUso) throw { status: 409, message: 'El email ya está en uso' };
  }

  const actualizado = await usuarioModel.update(id, {
    ...(nombre     && { nombre }),
    ...(email      && { email }),
    ...(id_rol     && { id_rol }),
    ...(id_cliente !== undefined && { id_cliente }),
    ...(estado     && { estado })
  });
  delete actualizado.password_hash;
  return actualizado;
};

const cambiarPassword = async (id, { password_actual, password_nueva }) => {
  if (!password_actual || !password_nueva)
    throw { status: 400, message: 'Se requieren password_actual y password_nueva' };

  const usuario = await usuarioModel.findById(id);
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado' };

  const valido = await usuarioModel.verificarPassword(usuario.email, password_actual);
  if (!valido) throw { status: 401, message: 'Contraseña actual incorrecta' };

  await usuarioModel.update(id, { password_hash: password_nueva });
};

const eliminar = async (id) => {
  const existe = await usuarioModel.findById(id);
  if (!existe) throw { status: 404, message: 'Usuario no encontrado' };
  await usuarioModel.update(id, { estado: 'inactivo' });
};

const login = async ({ email, password }) => {
  if (!email || !password)
    throw { status: 400, message: 'Email y password requeridos' };

  const usuario = await usuarioModel.findByEmail(email);
  if (!usuario) throw { status: 401, message: 'Credenciales inválidas' };

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    const hasta = new Date(usuario.bloqueado_hasta).toLocaleTimeString();
    throw { status: 423, message: `Cuenta bloqueada hasta las ${hasta}. Intenta más tarde.` };
  }

  if (usuario.estado !== 'activo')
    throw { status: 403, message: 'Cuenta inactiva. Contacta al administrador.' };

  const credencialesOk = await usuarioModel.verificarPassword(email, password);
  if (!credencialesOk) {
    const result = await usuarioModel.incrementarIntentos(usuario.id_usuario);
    const intentos = result.rows[0]?.intentos_fallidos ?? 0;
    if (intentos >= MAX_INTENTOS) {
      const hasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000);
      await usuarioModel.bloquear(usuario.id_usuario, hasta);
      throw { status: 423, message: `Demasiados intentos fallidos. Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.` };
    }
    throw { status: 401, message: `Credenciales inválidas. Intentos restantes: ${MAX_INTENTOS - intentos}` };
  }

  await usuarioModel.loginExitoso(usuario.id_usuario);

  const token = jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol, nivel: usuario.nivel, id_cliente: usuario.id_cliente },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  delete usuario.password_hash;
  delete usuario.intentos_fallidos;
  delete usuario.bloqueado_hasta;

  return { token, data: usuario };
};

const desbloquear = async (id) => {
  const existe = await usuarioModel.findById(id);
  if (!existe) throw { status: 404, message: 'Usuario no encontrado' };
  await usuarioModel.bloquear(id, null);
  await usuarioModel.update(id, { intentos_fallidos: 0 });
};

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, eliminar, login, desbloquear };