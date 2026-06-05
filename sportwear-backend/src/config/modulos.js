// src/config/modulos.js
// Fuente única de verdad para módulos oficiales del sistema.
// Usado por: roles.js (backend) y modulos.js (frontend vía copia o import)

const OFFICIAL_MODULES = [
  'Dashboard',
  'Usuarios',
  'Roles',
  'Productos',
  'Colores',
  'Catálogo',
  'Proveedores',
  'Compras',
  'PedidosVentas',
  'Pagos',
  'Configuración',
];

module.exports = { OFFICIAL_MODULES };