const jwt = require('jsonwebtoken');

// ── Verifica que el token sea válido ──────────────────────────
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ 
      "success": false,
      "message": "Se requiere autenticación para acceder a este recurso.",
      "status": 401
    });
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

// ── Comprueba que el usuario tenga asignado un módulo específico ─────
// ── Comprueba que el usuario tenga asignado un módulo (y opcionalmente una acción específica) ─────
const normalizeModulo = (value) =>
  value?.toString?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const tieneModulo = (moduloNombre, accion = null) => {
  return (req, res, next) => {
    // Admin siempre tiene acceso
    if (req.usuario?.rol === 'Admin') return next();

    const requestedModulo = normalizeModulo(moduloNombre);

    if (accion) {
      // Validación granular: requiere modulo.accion específico
      const permisos = req.usuario?.permisos;
      if (!Array.isArray(permisos)) {
        return res.status(403).json({ message: 'Acceso denegado. Permisos no definidos.' });
      }
      const permisoRequerido = `${requestedModulo}.${normalizeModulo(accion)}`;
      const usuarioPermisos = permisos.map(p => normalizeModulo(p));

      if (!usuarioPermisos.includes(permisoRequerido)) {
        return res.status(403).json({ message: `Acceso denegado. Requiere permiso: ${moduloNombre}.${accion}` });
      }
      return next();
    }

    // Validación por módulo (compatibilidad con rutas que no distinguen acción)
    const modulos = req.usuario?.modulos;
    if (!Array.isArray(modulos)) {
      return res.status(403).json({ message: 'Acceso denegado. Módulos no definidos.' });
    }
    const usuarioModulos = modulos.map(normalizeModulo).filter(Boolean);

    if (!requestedModulo || !usuarioModulos.includes(requestedModulo)) {
      return res.status(403).json({ message: `Acceso denegado. Requiere módulo: ${moduloNombre}` });
    }

    next();
  };
};
// ── Comprueba que el usuario tenga AL MENOS UNO de los módulos dados ─────
const tieneAlgunModulo = (...modulosNombres) => {
  return (req, res, next) => {
    // Admin siempre tiene acceso
    if (req.usuario?.rol === 'Admin') return next();

    const modulos = req.usuario?.modulos;
    if (!Array.isArray(modulos)) {
      return res.status(403).json({ message: 'Acceso denegado. Módulos no definidos.' });
    }

    const usuarioModulos = modulos.map(normalizeModulo).filter(Boolean);
    const requeridos = modulosNombres.map(normalizeModulo);

    const tieneAcceso = requeridos.some(r => usuarioModulos.includes(r));
    if (!tieneAcceso) {
      return res.status(403).json({ message: `Acceso denegado. Requiere alguno de estos módulos: ${modulosNombres.join(', ')}` });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  soloAdmin,
  soloCliente,
  adminOPropietario,
  tieneModulo,
  tieneAlgunModulo,
};