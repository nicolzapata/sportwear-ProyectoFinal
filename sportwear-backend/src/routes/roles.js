// src/routes/roles.js
const router = require('express').Router();
const pool   = require('../config/db');
const { verificarToken, soloAdmin, tieneModulo } = require('../middlewares/auth.middleware');
const { OFFICIAL_MODULES } = require('../config/modulos');

// ── Constantes ────────────────────────────────────────────────────────────────
const PROTECTED_ROLES = ['administrador', 'admin'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizar = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esProtegido = (nombre) =>
  PROTECTED_ROLES.includes(normalizar(nombre));

const formatRol = (rol) => ({ ...rol });

const fail = (res, err) => {
  const status  = err.status  || 500;
  const message = err.message || 'Error interno del servidor.';
  const errors  = err.errors  || undefined;
  return res.status(status).json(errors ? { message, errors } : { message });
};

const asignarPermisos = async (client, id_rol, permisos) => {
  if (!Array.isArray(permisos) || permisos.length === 0) return;

  const modulos = permisos.filter(p => typeof p === 'string').map(m => m.trim()).filter(Boolean);
  let ids       = permisos.filter(p => typeof p === 'number');

  if (ids.length > 0) {
    const { rows: permisosInfo } = await client.query(
      `SELECT id_permiso, modulo FROM "Permisos" WHERE id_permiso = ANY($1::int[])`,
      [ids]
    );
    const modulosConAccion = [...new Set(permisosInfo.map(p => p.modulo))];

    if (modulosConAccion.length > 0) {
      const { rows: verPermisos } = await client.query(
        `SELECT id_permiso FROM "Permisos"
         WHERE accion = 'ver' AND modulo = ANY($1::text[]) AND estado = 'Activo'`,
        [modulosConAccion]
      );
      const idsVer = verPermisos.map(p => p.id_permiso);
      ids = [...new Set([...ids, ...idsVer])];
    }
  }

  if (modulos.length > 0) {
    const unicos = [...new Set(modulos)];
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
  }

  if (ids.length > 0) {
    for (const id_permiso of ids) {
      const { rows } = await client.query(
        `SELECT 1 FROM "Permisos" WHERE id_permiso = $1 AND estado = 'Activo'`,
        [id_permiso]
      );
      if (!rows.length)
        throw { status: 400, message: `El permiso con ID ${id_permiso} no existe o no está activo.` };

      await client.query(
        `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado)
         VALUES ($1, $2, 'Activo')
         ON CONFLICT (id_rol, id_permiso) DO UPDATE SET estado = 'Activo'`,
        [id_rol, id_permiso]
      );
    }
  }
};

// ── GET /modulos ──────────────────────────────────────────────────────────────
router.get('/modulos', verificarToken, tieneModulo('Roles'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT p.modulo
       FROM "Permisos" p
       WHERE p.estado = 'Activo'
       ORDER BY p.modulo`
    );
    const ordered = rows
      .map(r => r.modulo)
      .filter(m => OFFICIAL_MODULES.map(x => x.toUpperCase()).includes(m.toUpperCase()))
      .sort((a, b) => {
        const idxA = OFFICIAL_MODULES.map(x => x.toUpperCase()).indexOf(a.toUpperCase());
        const idxB = OFFICIAL_MODULES.map(x => x.toUpperCase()).indexOf(b.toUpperCase());
        return idxA - idxB;
      });
    res.json(ordered);
  } catch (err) { fail(res, err); }
});

// ── GET /permisos ─────────────────────────────────────────────────────────────
router.get('/permisos', verificarToken, tieneModulo('Roles'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id_permiso, p.modulo, p.accion, p.descripcion
       FROM "Permisos" p
       WHERE p.estado = 'Activo'
       ORDER BY p.modulo, p.accion`
    );

    const catalog = {};
    OFFICIAL_MODULES.forEach(mod => { catalog[mod] = []; });

    rows.forEach(row => {
      const modKey = OFFICIAL_MODULES.find(m => m.toUpperCase() === row.modulo.toUpperCase());
      if (modKey) {
        catalog[modKey].push({
          id_permiso:  row.id_permiso,
          accion:      row.accion,
          descripcion: row.descripcion,
        });
      }
    });

    res.json(catalog);
  } catch (err) { fail(res, err); }
});

// ── POST /modulos/sync ────────────────────────────────────────────────────────
router.post('/modulos/sync', verificarToken, soloAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM "Modulos" WHERE UPPER(nombre) NOT IN (${OFFICIAL_MODULES.map((_, i) => `UPPER($${i + 1})`).join(',')})`,
      OFFICIAL_MODULES
    );
    for (let i = 0; i < OFFICIAL_MODULES.length; i++) {
      const nombre = OFFICIAL_MODULES[i];
      const ruta   = '/' + nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await client.query(
        `INSERT INTO "Modulos" (nombre, icono, ruta_base, orden, estado, fecha_creacion)
         SELECT $1, '', $2, $3, 'Activo', NOW()
         WHERE NOT EXISTS (SELECT 1 FROM "Modulos" m WHERE UPPER(m.nombre) = UPPER($1))`,
        [nombre, ruta, i + 1]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Sincronización completada.' });
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, err);
  } finally { client.release(); }
});

// ── GET / — listar roles ──────────────────────────────────────────────────────
router.get('/', verificarToken, tieneModulo('Roles', 'ver'), async (req, res) => {
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
         ORDER BY r.nombre ASC`
      );
      const normalized = rows.map(r => {
        const raw  = Array.isArray(r.modulos) ? r.modulos : [];
        const seen = new Set();
        const ordered = [];
        OFFICIAL_MODULES.forEach(mod => {
          if (raw.some(item => item && item.toString().toUpperCase() === mod.toUpperCase())) {
            if (!seen.has(mod.toUpperCase())) {
              seen.add(mod.toUpperCase());
              ordered.push(mod);
            }
          }
        });
        return { ...r, modulos: ordered };
      });
      return res.json(normalized.map(formatRol));
    }

    const { rows } = await pool.query(
      `SELECT r.id_rol, nombre, estado
         FROM "Roles" r
         WHERE estado = 'Activo'
         ORDER BY nombre ASC`
    );
    res.json(rows.map(formatRol));
  } catch (err) { fail(res, err); }
});

// ── GET /:id — detalle del rol ────────────────────────────────────────────────
router.get('/:id', verificarToken, tieneModulo('Roles', 'ver'), async (req, res) => {
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
         COALESCE(array_agg(DISTINCT p.modulo) FILTER (WHERE p.modulo IS NOT NULL), '{}') AS modulos,
         (SELECT COUNT(*) FROM "Usuarios" u WHERE u.id_rol = r.id_rol AND u.estado = 'Activo') AS usuarios_activos
       FROM "Roles" r
       LEFT JOIN "RolesPermisos" rp ON r.id_rol = rp.id_rol AND rp.estado = 'Activo'
       LEFT JOIN "Permisos" p ON rp.id_permiso = p.id_permiso AND p.estado = 'Activo'
       WHERE r.id_rol = $1
       GROUP BY r.id_rol`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Rol no encontrado.' });

    const rol    = rows[0];
    const rawMod = Array.isArray(rol.modulos) ? rol.modulos : [];
    const seen   = new Set();
    const ordered = [];
    OFFICIAL_MODULES.forEach(mod => {
      if (rawMod.some(item => item && item.toString().toUpperCase() === mod.toUpperCase())) {
        if (!seen.has(mod.toUpperCase())) {
          seen.add(mod.toUpperCase());
          ordered.push(mod);
        }
      }
    });
    rol.modulos = ordered;

    if (req.usuario.rol !== 'Admin' && rol.estado !== 'Activo')
      return res.status(403).json({ message: 'Acceso denegado.' });

    res.json(formatRol(rol));
  } catch (err) { fail(res, err); }
});

// ── POST / — crear rol ────────────────────────────────────────────────────────
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, estado = 'Activo', permisos = [] } = req.body;

  const errs = {};
  if (!nombre?.trim()) errs.nombre = 'El nombre del rol es obligatorio.';
  if (!['Activo', 'Inactivo'].includes(estado))
    errs.estado = "Estado inválido. Use 'Activo' o 'Inactivo'.";
  if (!Array.isArray(permisos) || permisos.length === 0)
    errs.permisos = 'Debes asignar al menos un permiso.';

  if (Object.keys(errs).length)
    return res.status(400).json({ message: 'Datos inválidos.', errors: errs });

  if (esProtegido(nombre))
    return res.status(403).json({ message: 'No se puede crear un rol con nombre protegido del sistema.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existe = await client.query(
      `SELECT 1 FROM "Roles" WHERE UPPER(nombre) = UPPER($1)`,
      [nombre.trim()]
    );
    if (existe.rows.length)
      throw { status: 409, message: `Ya existe un rol con el nombre '${nombre.trim()}'.` };

    const { rows: [nuevo] } = await client.query(
      `INSERT INTO "Roles" (nombre, nivel, estado)
       VALUES ($1, NULL, $2) RETURNING *`,
      [nombre.trim(), estado]
    );

    await asignarPermisos(client, nuevo.id_rol, permisos);

    await client.query('COMMIT');
    res.status(201).json(formatRol(nuevo));
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, err);
  } finally { client.release(); }
});

// ── PUT /:id — actualizar rol ─────────────────────────────────────────────────
router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, estado, permisos } = req.body;

  const errs = {};
  if (nombre  !== undefined && !nombre?.trim())  errs.nombre = 'El nombre no puede estar vacío.';
  if (estado  !== undefined && !['Activo', 'Inactivo'].includes(estado)) errs.estado = 'Estado inválido.';
  if (permisos !== undefined && !Array.isArray(permisos)) errs.permisos = 'Los permisos deben ser un arreglo.';

  if (Object.keys(errs).length)
    return res.status(400).json({ message: 'Datos inválidos.', errors: errs });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [actual] } = await client.query(
      `SELECT * FROM "Roles" WHERE id_rol = $1`, [req.params.id]
    );
    if (!actual) throw { status: 404, message: 'Rol no encontrado.' };

    if (esProtegido(actual.nombre))
      throw { status: 403, message: 'No se puede modificar un rol protegido del sistema.' };

    if (nombre !== undefined && esProtegido(nombre))
      throw { status: 403, message: 'No se puede asignar un nombre protegido al rol.' };

    if (nombre !== undefined) {
      const dup = await client.query(
        `SELECT 1 FROM "Roles" WHERE UPPER(nombre) = UPPER($1) AND id_rol <> $2`,
        [nombre.trim(), req.params.id]
      );
      if (dup.rows.length)
        throw { status: 409, message: `Ya existe otro rol con el nombre '${nombre.trim()}'.` };
    }

    const sets = [], valores = [];
    let idx = 1;
    if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); valores.push(nombre.trim()); }
    if (estado !== undefined) { sets.push(`estado = $${idx++}`); valores.push(estado); }

    if (sets.length) {
      valores.push(req.params.id);
      await client.query(`UPDATE "Roles" SET ${sets.join(', ')} WHERE id_rol = $${idx}`, valores);
    }

    if (permisos !== undefined) {
      await client.query(`DELETE FROM "RolesPermisos" WHERE id_rol = $1`, [req.params.id]);
      await asignarPermisos(client, req.params.id, permisos);
    }

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

    if (nuevoEstado === 'Inactivo' && esProtegido(rol.nombre))
      throw { status: 403, message: 'No se puede desactivar un rol protegido del sistema.' };

    const { rows: [actualizado] } = await client.query(
      `UPDATE "Roles" SET estado = $1 WHERE id_rol = $2 RETURNING *`,
      [nuevoEstado, req.params.id]
    );

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

// ── GET /:id/usuarios — lista de usuarios asignados al rol ────────────────────
router.get('/:id/usuarios', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_usuario, nombre, email, estado
       FROM "Usuarios"
       WHERE id_rol = $1
       ORDER BY nombre ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { fail(res, err); }
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