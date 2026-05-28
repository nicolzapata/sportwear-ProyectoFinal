// src/services/roles.service.js
const rolModel = require('../models/rol.model');
const permisoModel = require('../models/permiso.model');
const moduloModel = require('../models/modulo.model');

// List of protected role names (case-insensitive)
const PROTECTED_ROLES = ['administrador', 'admin'];

/**
 * Checks if a role name is protected.
 * @param {string} nombre - Role name to check.
 * @returns {boolean} True if protected.
 */
const esRolProtegido = (nombre) => {
  if (!nombre) return false;
  const normalized = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return PROTECTED_ROLES.includes(normalized);
};

/**
 * Get all roles (with filtering for non-admin users).
 * @param {string} userRole - Role of the logged-in user.
 * @returns {Promise<Array>} List of roles.
 */
const getRoles = async (userRole) => {
  if (userRole === 'Admin') {
    return await rolModel.findAll();
  }
  return await rolModel.findActivos();
};

/**
 * Get a role by ID, with permissions if user is admin.
 * @param {number} id - Role ID.
 * @param {string} userRole - Role of the logged-in user.
 * @returns {Promise<Object>} Role data.
 */
const getRolById = async (id, userRole) => {
  if (userRole === 'Admin') {
    const rolConPermisos = await rolModel.findConPermisos(id);
    if (!rolConPermisos) throw { status: 404, message: 'Rol no encontrado.' };
    return rolConPermisos;
  }
  const rolData = await rolModel.findById(id);
  if (!rolData) throw { status: 404, message: 'Rol no encontrado.' };
  return rolData;
};

/**
 * Create a new role with permissions.
 * @param {Object} roleData - { nombre, descripcion, nivel, estado, permisos: [string] }
 * @returns {Promise<Object>} Created role.
 */
const createRole = async (roleData) => {
  const { nombre, descripcion, nivel, estado, permisos = [] } = roleData;

  // Validate required fields
  if (!nombre || !nombre.trim()) {
    throw { status: 400, message: 'El nombre del rol es obligatorio.' };
  }
  if (!descripcion || !descripcion.trim()) {
    throw { status: 400, message: 'La descripción es obligatoria.' };
  }
  if (nivel === undefined || nivel === null) {
    throw { status: 400, message: 'El nivel de acceso es obligatorio.' };
  }
  if (![1, 2, 3].includes(nivel)) {
    throw { status: 400, message: 'Nivel de acceso inválido. Debe ser 1 (Observador), 2 (Editor) o 3 (Admin).' };
  }
  if (!estado) {
    throw { status: 400, message: 'El estado es obligatorio.' };
  }
  if (!['Activo', 'Inactivo'].includes(estado)) {
    throw { status: 400, message: "Estado inválido. Debe ser 'Activo' o 'Inactivo'." };
  }
  if (!Array.isArray(permisos)) {
    throw { status: 400, message: 'Los permisos deben ser un arreglo.' };
  }

  // Check for protected role name (case-insensitive)
  if (esRolProtegido(nombre)) {
    throw { status: 403, message: 'No se puede crear un rol con un nombre protegido.' };
  }

  // Start transaction
  const client = await rolModel.pool.connect();
  try {
    await client.query('BEGIN');

    // Insert role
    const roleResult = await client.query(
      `INSERT INTO "Roles" (nombre, descripcion, nivel, estado) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [nombre.trim(), descripcion.trim(), nivel, estado]
    );
    const id_rol = roleResult.rows[0].id_rol;

    // Assign permissions if any
    if (permisos.length > 0) {
      const modulosUnicos = [...new Set(permisos.map(p => p.trim()))];
      for (const moduloNombre of modulosUnicos) {
        // Find active permission by modulo name (case-insensitive)
        const permisoResult = await client.query(
          `SELECT id_permiso FROM "Permisos" 
           WHERE UPPER(modulo) = UPPER($1) AND estado = 'Activo'`,
          [moduloNombre]
        );
        if (permisoResult.rows.length === 0) {
          throw { status: 400, message: `El módulo '${moduloNombre}' no existe o no está activo.` };
        }
        // For each permission found (there might be multiple actions per modulo)
        for (const permisoRow of permisoResult.rows) {
          await client.query(
            `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado) 
             VALUES ($1, $2, 'Activo')`,
            [id_rol, permisoRow.id_permiso]
          );
        }
      }
    }

    await client.query('COMMIT');
    const result = await client.query(
      `SELECT * FROM "Roles" WHERE id_rol = $1`,
      [id_rol]
    );
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update an existing role with permissions.
 * @param {number} id - Role ID.
 * @param {Object} roleData - { nombre, descripcion, estado, nivel, permisos: [string] }
 * @returns {Promise<Object>} Updated role.
 */
const updateRole = async (id, roleData) => {
  const { nombre, descripcion, estado, nivel, permisos = [] } = roleData;

  // Validate that the role exists and is not protected (if we are updating to a protected name? we check the new name)
  const existingRole = await rolModel.findById(id);
  if (!existingRole) {
    throw { status: 404, message: 'Rol no encontrado.' };
  }

  // Check if the role is protected (by current name) - if protected, only allow certain updates? 
  // According to requirements, protected roles cannot be modified. So we block any update if the role is protected.
  if (esRolProtegido(existingRole.nombre)) {
    throw { status: 403, message: 'No se puede modificar un rol protegido.' };
  }

  // Validate input (similar to create, but allow partial updates? We'll require all fields for simplicity, but we can adjust)
  // We'll validate each field if provided.
  if (nombre !== undefined && (!nombre || !nombre.trim())) {
    throw { status: 400, message: 'El nombre del rol no puede estar vacío.' };
  }
  if (descripcion !== undefined && (!descripcion || !descripcion.trim())) {
    throw { status: 400, message: 'La descripción no puede estar vacía.' };
  }
  if (nivel !== undefined && (nivel === null || ![1, 2, 3].includes(nivel))) {
    throw { status: 400, message: 'Nivel de acceso inválido. Debe ser 1 (Observador), 2 (Editor) o 3 (Admin).' };
  }
  if (estado !== undefined && (!['Activo', 'Inactivo'].includes(estado))) {
    throw { status: 400, message: "Estado inválido. Debe ser 'Activo' o 'Inactivo'." };
  }
  if (permisos !== undefined && !Array.isArray(permisos)) {
    throw { status: 400, message: 'Los permisos deben ser un arreglo.' };
  }

  // If updating the name to a protected one, block
  if (nombre !== undefined && esRolProtegido(nombre)) {
    throw { status: 403, message: 'No se puede establecer un nombre protegido para el rol.' };
  }

  const client = await rolModel.pool.connect();
  try {
    await client.query('BEGIN');

    // Build dynamic UPDATE for roles table
    const sets = [];
    const values = [];
    let idx = 1;

    if (nombre !== undefined) {
      sets.push(`nombre = $${idx++}`);
      values.push(nombre.trim());
    }
    if (descripcion !== undefined) {
      sets.push(`descripcion = $${idx++}`);
      values.push(descripcion.trim());
    }
    if (estado !== undefined) {
      sets.push(`estado = $${idx++}`);
      values.push(estado);
    }
    if (nivel !== undefined) {
      sets.push(`nivel = $${idx++}`);
      values.push(nivel);
    }

    if (sets.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE "Roles" SET ${sets.join(', ')} WHERE id_rol = $${idx}`,
        values
      );
    }

    // Update permissions: delete all existing and insert new ones (if permisos is provided, even if empty array)
    if (permisos !== undefined) {
      // Delete existing permissions for this role
      await client.query(`DELETE FROM "RolesPermisos" WHERE id_rol = $1`, [id]);

      // Insert new permissions if any
      if (permisos.length > 0) {
        const modulosUnicos = [...new Set(permisos.map(p => p.trim()))];
        for (const moduloNombre of modulosUnicos) {
          const permisoResult = await client.query(
            `SELECT id_permiso FROM "Permisos" 
             WHERE UPPER(modulo) = UPPER($1) AND estado = 'Activo'`,
            [moduloNombre]
          );
          if (permisoResult.rows.length === 0) {
            throw { status: 400, message: `El módulo '${moduloNombre}' no existe o no está activo.` };
          }
          for (const permisoRow of permisoResult.rows) {
            await client.query(
              `INSERT INTO "RolesPermisos" (id_rol, id_permiso, estado) 
               VALUES ($1, $2, 'Activo')`,
              [id, permisoRow.id_permiso]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    // Fetch and return updated role
    const updatedRole = await rolModel.findConPermisos(id);
    if (!updatedRole) throw { status: 404, message: 'Rol no encontrado después de la actualización.' };
    return updatedRole;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Change the state of a role (activate/deactivate) and update users' state.
 * @param {number} id - Role ID.
 * @returns {Promise<Object>} Updated role.
 */
const changeRoleState = async (id) => {
  const client = await rolModel.pool.connect();
  try {
    await client.query('BEGIN');

    // Get current state
    const rolResult = await client.query(
      `SELECT estado FROM "Roles" WHERE id_rol = $1`,
      [id]
    );
    if (!rolResult.rows.length) {
      throw { status: 404, message: 'Rol no encontrado.' };
    }

    const currentState = rolResult.rows[0].estado;
    const nuevoEstado = currentState === 'Activo' ? 'Inactivo' : 'Activo';

    // Check if the role is protected (cannot be deactivated)
    if (nuevoEstado === 'Inactivo' && esRolProtegido(rolResult.rows[0].nombre)) {
      throw { status: 403, message: 'No se puede desactivar un rol protegido.' };
    }

    // Update role state
    const rolActualizado = await client.query(
      `UPDATE "Roles" SET estado = $1 WHERE id_rol = $2 RETURNING *`,
      [nuevoEstado, id]
    );

    // Update users' state to match the role state
    await client.query(
      `UPDATE "Usuarios" SET estado = $1 WHERE id_rol = $2`,
      [nuevoEstado, id]
    );

    await client.query('COMMIT');
    return rolActualizado.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get permissions for a role.
 * @param {number} id - Role ID.
 * @returns {Promise<Array>} List of permissions.
 */
const getRolePermissions = async (id) => {
  const result = await rolModel.pool.query(
    `SELECT p.id_permiso, p.nombre, p.modulo, p.accion
     FROM "Permisos" p
     JOIN "RolesPermisos" rp ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = $1 AND rp.estado = 'Activo' AND p.estado = 'Activo'
     ORDER BY p.modulo, p.accion`,
    [id]
  );
  return result.rows;
};

module.exports = {
  getRoles,
  getRolById,
  createRole,
  updateRole,
  changeRoleState,
  getRolePermissions,
  esRolProtegido // export for use in middleware or controllers if needed
};