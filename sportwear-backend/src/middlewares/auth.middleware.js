// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

// ── Verifica que el token sea válido ──────────────────────────
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario   = decoded; // { id_usuario, nombre, email, rol, id_cliente }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(403).json({ message: 'Token inválido.' });
  }
};

// ── Solo Admin ────────────────────────────────────────────────
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'Admin') {
    return res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
  }
  next();
};

// ── Solo Cliente ──────────────────────────────────────────────
const soloCliente = (req, res, next) => {
  if (req.usuario?.rol !== 'Cliente') {
    return res.status(403).json({ message: 'Acceso denegado. Solo clientes.' });
  }
  next();
};

// ── Admin o el mismo Cliente ──────────────────────────────────
const adminOPropietario = (req, res, next) => {
  const { rol, id_cliente } = req.usuario;
  const idParam = parseInt(req.params.id);

  if (rol === 'Admin') return next();
  if (rol === 'Cliente' && id_cliente === idParam) return next();

  return res.status(403).json({ message: 'Acceso denegado.' });
};

module.exports = { verificarToken, soloAdmin, soloCliente, adminOPropietario };