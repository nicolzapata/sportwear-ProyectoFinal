// src/controllers/auth.controller.js
const authService = require('../services/auth.service');

const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    if (!email || !contrasena)
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    const data = await authService.login({ email, contrasena });
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
  }
};

const registro = async (req, res) => {
  try {
    const { nombre, email, contrasena, documento } = req.body;
    if (!nombre || !email || !contrasena || !documento)
      return res.status(400).json({ message: 'Nombre, email, contraseña y documento son requeridos' });
    const data = await authService.registro(req.body);
    res.status(201).json({ ok: true, message: 'Registro exitoso', ...data });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, contrasena, id_rol } = req.body;
    if (!nombre || !email || !contrasena || !id_rol)
      return res.status(400).json({ message: 'Nombre, email, contraseña y rol son requeridos' });
    const usuario = await authService.crearUsuario({ nombre, email, contrasena, id_rol });
    res.status(201).json({ ok: true, message: 'Usuario creado correctamente', usuario });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { nombre, email, id_rol } = req.body;
    if (!nombre || !email || !id_rol)
      return res.status(400).json({ message: 'Nombre, email y rol son requeridos' });
    await authService.actualizarUsuario(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
  }
};

const perfil = async (req, res) => {
  try {
    const data = await authService.getPerfil(req.usuario.id_usuario);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
  }
};

const recuperar = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ message: 'El correo es requerido.' });
  try {
    await authService.recuperarContrasena(email);
    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás las instrucciones.',
    });
  } catch (err) {
    console.error('Error en recuperar contraseña:', err);
    return res.status(500).json({ message: 'Error al procesar la solicitud.' });
  }
};

const restablecer = async (req, res) => {
  const { token, contrasena } = req.body;
  if (!token || !contrasena)
    return res.status(400).json({ message: 'Token y contraseña son requeridos.' });
  try {
    await authService.restablecerContrasena(token, contrasena);
    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor.' });
  }
};

module.exports = { login, registro, crearUsuario, actualizarUsuario, perfil, recuperar, restablecer };