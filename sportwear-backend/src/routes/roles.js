// src/routes/roles.js
const router = require('express').Router();
const pool   = require('../config/db');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// ── Constantes ────────────────────────────────────────────────────────────────

const PROTECTED_ROLES = ['administrador', 'admin'];

const NIVEL_MAP = { Observador: 1, Editor: 2, Admin: 3 };
const NIVEL_LABEL = { 1: 'Observador', 2: 'Editor', 3: 'Admin' };

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizar = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esProtegido = (nombre) =>
  PROTECTED_ROLES.includes(normalizar(nombre));

const resolverNivel = (valor) => {
  if (typeof valor === 'number') return [1, 2, 3].includes(valor) ? valor : null;
  return NIVEL_MAP[valor] ?? null;
};

/** Inserta en RolesPermisos todos los permisos de los módulos dados (dentro de una transacción). */
const asignarPermisos = async (client, id_rol, modulos) => {
  const unicos = [...new Set(modulos.map(m => m.trim()).filter(Boolean))];
  for (const modulo of unicos) {
    const { rows } = await client.query(
      `SELECT id_permiso FROM "Permisos"
       WHERE UPPER(modulo) = UPPER($1) AND estado = 'Activo'`,
      [modulo]
    );
    if (!rows.length)
      throw { status: 400, message: `El módulo '${modulo}' no existe o no está activo.` };
    for (const { id_permiso } of rows) {
      await client.query(
        `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado)
         VALUES ($1, $2, 'Activo')
         ON CONFLICT (id_rol, id_permiso) DO UPDATE SET estado = 'Activo'`,
        [id_rol, id_permiso]
      );
    }
  }
};

/** Enriquece nivel numérico → etiqueta legible */
const formatRol = (rol) => ({
  ...rol,
  nivel_acceso: NIVEL_LABEL[rol.nivel] ?? String(rol.nivel ?? ''),
});

/** Manejador de error normalizado */
const fail = (res, err) => {
  const status  = err.status  || 500;
  const message = err.message || 'Error interno del servidor.';
  const errors  = err.errors  || undefined;
  return res.status(status).json(errors ? { message, errors } : { message });
};

// ── GET /modulos — lista módulos activos para el selector del formulario ──────
// IMPORTANTE: va antes de /:id para que Express no lo interprete como ID
router.get('/modulos', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT modulo
       FROM "Permisos"
       WHERE estado = 'Activo'
       ORDER BY modulo ASC`
    );
    res.json(rows.map(r => r.modulo));
  } catch (err) { fail(res, err); }
});

// ── GET / — listar roles ──────────────────────────────────────────────────────
router.get('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol === 'Admin') {
      const { rows } = await pool.query(
        `SELECT r.*,
           COALESCE(array_agg(DISTINCT p.modulo) FILTER (WHERE p.modulo IS NOT NULL), '{}') AS modulos,
           (SELECT COUNT(*) FROM "Usuarios" u WHERE u.id_rol = r.id_rol AND u.estado = 'Activo') AS usuarios_activos
         FROM "Roles" r
         LEFT JOIN "RolesPermisos" rp ON r.id_rol = rp.id_rol AND rp.estado = 'Activo'
         LEFT JOIN "Permisos" p ON rp.id_permiso = p.id_permiso AND p.estado = 'Activo'
         GROUP BY r.id_rol
         ORDER BY r.nivel ASC, r.nombre ASC`
      );
      return res.json(rows.map(formatRol));
    }
    const { rows } = await pool.query(
      `SELECT id_rol, nombre, descripcion, estado, nivel
       FROM "Roles"
       WHERE estado = 'Activo'
       ORDER BY nivel ASC, nombre ASC`
    );
    res.json(rows.map(formatRol));
  } catch (err) { fail(res, err); }
});

// ── GET /:id — detalle del rol ────────────────────────────────────────────────
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
         COALESCE(
           json_agg(json_build_object(
             'id_permiso', p.id_permiso,
             'nombre', p.nombre,
             'modulo', p.modulo,
             'accion', p.accion
           )) FILTER (WHERE p.id_permiso IS NOT NULL),
           '[]'
         ) AS permisos_detalle,
         COALESCE(array_agg(DISTINCT p.modulo) FILTER (WHERE p.modulo IS NOT NULL), '{}') AS modulos
       FROM "Roles" r
       LEFT JOIN "RolesPermisos" rp ON r.id_rol = rp.id_rol AND rp.estado = 'Activo'
       LEFT JOIN "Permisos" p ON rp.id_permiso = p.id_permiso AND p.estado = 'Activo'
       WHERE r.id_rol = $1
       GROUP BY r.id_rol`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Rol no encontrado.' });

    const rol = rows[0];
    // Usuarios no-admin solo pueden ver roles activos
    if (req.usuario.rol !== 'Admin' && rol.estado !== 'Activo')
      return res.status(403).json({ message: 'Acceso denegado.' });

    res.json(formatRol(rol));
  } catch (err) { fail(res, err); }
});

// ── POST / — crear rol con permisos ──────────────────────────────────────────
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, descripcion, estado = 'Activo', nivel_acceso, permisos = [] } = req.body;

  // Validaciones
  const errs = {};
  if (!nombre?.trim())      errs.nombre      = 'El nombre del rol es obligatorio.';
  if (!descripcion?.trim()) errs.descripcion = 'La descripción es obligatoria.';
  if (!nivel_acceso)        errs.nivel_acceso = 'El nivel de acceso es obligatorio.';
  if (!['Activo', 'Inactivo'].includes(estado))
    errs.estado = "Estado inválido. Use 'Activo' o 'Inactivo'.";
  if (!Array.isArray(permisos) || permisos.length === 0)
    errs.permisos = 'Debes asignar al menos un módulo.';

  if (Object.keys(errs).length)
    return res.status(400).json({ message: 'Datos inválidos.', errors: errs });

  if (esProtegido(nombre))
    return res.status(403).json({ message: 'No se puede crear un rol con nombre protegido del sistema.' });

  const nivel = resolverNivel(nivel_acceso);
  if (!nivel)
    return res.status(400).json({ message: `Nivel '${nivel_acceso}' inválido. Use: Observador, Editor o Admin.` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Nombre duplicado
    const existe = await client.query(
      `SELECT 1 FROM "Roles" WHERE UPPER(nombre) = UPPER($1)`,
      [nombre.trim()]
    );
    if (existe.rows.length)
      throw { status: 409, message: `Ya existe un rol con el nombre '${nombre.trim()}'.` };

    const { rows: [nuevo] } = await client.query(
      `INSERT INTO "Roles" (nombre, descripcion, nivel, estado)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), descripcion.trim(), nivel, estado]
    );

    await asignarPermisos(client, nuevo.id_rol, permisos);

    await client.query('COMMIT');
    res.status(201).json(formatRol(nuevo));
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, err);
  } finally { client.release(); }
});

// ── PUT /:id — actualizar rol con permisos ────────────────────────────────────
router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, descripcion, estado, nivel_acceso, permisos } = req.body;

  // Validaciones opcionales
  const errs = {};
  if (nombre      !== undefined && !nombre?.trim())      errs.nombre      = 'El nombre no puede estar vacío.';
  if (descripcion !== undefined && !descripcion?.trim()) errs.descripcion = 'La descripción no puede estar vacía.';
  if (estado      !== undefined && !['Activo', 'Inactivo'].includes(estado))
    errs.estado = "Estado inválido.";
  if (permisos !== undefined && (!Array.isArray(permisos) || permisos.length === 0))
    errs.permisos = 'Debes asignar al menos un módulo.';

  if (Object.keys(errs).length)
    return res.status(400).json({ message: 'Datos inválidos.', errors: errs });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar existencia
    const { rows: [actual] } = await client.query(
      `SELECT * FROM "Roles" WHERE id_rol = $1`, [req.params.id]
    );
    if (!actual)
      throw { status: 404, message: 'Rol no encontrado.' };

    // Protección: no modificar roles del sistema
    if (esProtegido(actual.nombre))
      throw { status: 403, message: 'No se puede modificar un rol protegido del sistema.' };

    // No permitir renombrar a nombre protegido
    if (nombre !== undefined && esProtegido(nombre))
      throw { status: 403, message: 'No se puede asignar un nombre protegido al rol.' };

    // Nombre duplicado (si se cambia)
    if (nombre !== undefined) {
      const dup = await client.query(
        `SELECT 1 FROM "Roles" WHERE UPPER(nombre) = UPPER($1) AND id_rol <> $2`,
        [nombre.trim(), req.params.id]
      );
      if (dup.rows.length)
        throw { status: 409, message: `Ya existe otro rol con el nombre '${nombre.trim()}'.` };
    }

    // UPDATE dinámico
    const sets = [], valores = [];
    let idx = 1;

    if (nombre      !== undefined) { sets.push(`nombre = $${idx++}`);      valores.push(nombre.trim()); }
    if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); valores.push(descripcion.trim()); }
    if (estado      !== undefined) { sets.push(`estado = $${idx++}`);      valores.push(estado); }
    if (nivel_acceso !== undefined) {
      const nivel = resolverNivel(nivel_acceso);
      if (!nivel) throw { status: 400, message: `Nivel '${nivel_acceso}' inválido.` };
      sets.push(`nivel = $${idx++}`);
      valores.push(nivel);
    }

    if (sets.length) {
      valores.push(req.params.id);
      await client.query(
        `UPDATE "Roles" SET ${sets.join(', ')} WHERE id_rol = $${idx}`, valores
      );
    }

    // Reemplazar permisos solo si se enviaron explícitamente
    if (permisos !== undefined) {
      await client.query(`DELETE FROM "RolesPermisos" WHERE id_rol = $1`, [req.params.id]);
      await asignarPermisos(client, req.params.id, permisos);
    }

    // Devolver el rol actualizado con sus módulos
    const { rows: [actualizado] } = await client.query(
      `SELECT r.*,
         COALESCE(array_agg(DISTINCT p.modulo) FILTER (WHERE p.modulo IS NOT NULL), '{}') AS modulos
       FROM "Roles" r
       LEFT JOIN "RolesPermisos" rp ON r.id_rol = rp.id_rol AND rp.estado = 'Activo'
       LEFT JOIN "Permisos" p ON rp.id_permiso = p.id_permiso AND p.estado = 'Activo'
       WHERE r.id_rol = $1
       GROUP BY r.id_rol`,
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json(formatRol(actualizado));
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, err);
  } finally { client.release(); }
});

// ── PATCH /:id/estado — toggle activo/inactivo ────────────────────────────────
router.patch('/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id_rol, nombre, estado FROM "Roles" WHERE id_rol = $1`, [req.params.id]
    );
    if (!rows.length) throw { status: 404, message: 'Rol no encontrado.' };

    const rol         = rows[0];
    const nuevoEstado = rol.estado === 'Activo' ? 'Inactivo' : 'Activo';

    // Bloquear desactivación de roles protegidos
    if (nuevoEstado === 'Inactivo' && esProtegido(rol.nombre))
      throw { status: 403, message: 'No se puede desactivar un rol protegido del sistema.' };

    const { rows: [actualizado] } = await client.query(
      `UPDATE "Roles" SET estado = $1 WHERE id_rol = $2 RETURNING *`,
      [nuevoEstado, req.params.id]
    );

    // Sincronizar estado de los usuarios de este rol
    await client.query(
      `UPDATE "Usuarios" SET estado = $1 WHERE id_rol = $2`,
      [nuevoEstado, req.params.id]
    );

    await client.query('COMMIT');
    res.json(formatRol(actualizado));
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, err);
  } finally { client.release(); }
});

// ── GET /:id/usuarios-count ───────────────────────────────────────────────────
router.get('/:id/usuarios-count', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total FROM "Usuarios"
       WHERE id_rol = $1 AND estado = 'Activo'`,
      [req.params.id]
    );
    res.json({ total: parseInt(rows[0].total, 10) });
  } catch (err) { fail(res, err); }
});

// ── GET /:id/permisos ─────────────────────────────────────────────────────────
router.get('/:id/permisos', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id_permiso, p.nombre, p.modulo, p.accion
       FROM "Permisos" p
       JOIN "RolesPermisos" rp ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = $1 AND rp.estado = 'Activo' AND p.estado = 'Activo'
       ORDER BY p.modulo ASC, p.accion ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { fail(res, err); }
});

module.exports = router;