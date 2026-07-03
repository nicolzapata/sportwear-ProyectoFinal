// src/utils/rolesProtegidos.js
// Roles del sistema cuyo estado nunca puede desactivarse (siempre permanecen Activo).
const ROLES_PROTEGIDOS = ['administrador', 'admin'];

const normalizar = (str = '') =>
  str.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esRolProtegido = (nombreRol) => ROLES_PROTEGIDOS.includes(normalizar(nombreRol));

module.exports = { esRolProtegido, normalizar };
