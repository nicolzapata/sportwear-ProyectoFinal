// src/config/permisos.js

// ─── Menú completo (orden, metadatos y nombre oficial de módulo) ──────────────────────────
export const MENU_ITEMS = [
  { key: "roles",       path: "/roles",       icon: "🔑", label: "Roles", module: "Roles" },
  { key: "usuarios",    path: "/usuarios",    icon: "👤", label: "Usuarios",    divider: true, modules: ["Usuarios", "Clientes"] },
  { key: "productos",   path: "/productos",   icon: "👕", label: "Productos",   divider: true, module: "Productos" },
  { key: "proveedores", path: "/proveedores", icon: "🏭", label: "Proveedores", module: "Proveedores" },
  { key: "compras",     path: "/compras",     icon: "📦", label: "Compras", module: "Compras" },
  { key: "catalogo",    path: "/catalogo",    icon: "📋", label: "Catálogo",    divider: true, module: "Catálogo" },
  { key: "pedidos",     path: "/pedidos",     icon: "💰", label: "Pedidos y Ventas", module: "PedidosVentas" },
  { key: "pagos",       path: "/pagos",       icon: "💳", label: "Pagos", module: "Pagos" },
  { key: "colores",     path: "/colores",     icon: "🎨", label: "Colores", module: "Colores" },
  { key: "dashboard",   path: "/dashboard",   icon: "📊", label: "Mi panel", divider: true, module: "Dashboard" },
];

// PERMISOS está deprecado: ahora se utilizan los módulos asignados por el backend.
export const PERMISOS = {};