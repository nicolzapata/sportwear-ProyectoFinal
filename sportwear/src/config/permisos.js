// src/config/permisos.js

// ─── Menú completo (orden, metadatos y nombre oficial de módulo) ──────────────────────────
export const MENU_ITEMS = [
  { key: "dashboard",   path: "/dashboard",   icon: "📊", label: "Mi panel", module: "Dashboard" },  
  { key: "roles",       path: "/roles",       icon: "🔑", label: "Roles",divider: true, module: "Roles" },
  { key: "usuarios",    path: "/usuarios",    icon: "👤", label: "Usuarios", modules: ["Usuarios", "Clientes"] },
  { key: "productos",   path: "/productos",   icon: "👕", label: "Productos",   divider: true, module: "Productos" },
  { key: "proveedores", path: "/proveedores", icon: "🏭", label: "Proveedores", module: "Proveedores" },
  { key: "compras",     path: "/compras",     icon: "📦", label: "Compras", module: "Compras" },
  { key: "catalogo",    path: "/catalogo",    icon: "📋", label: "Catálogo",    divider: true, module: "Catálogo" },
  { key: "pedidos",     path: "/pedidos",     icon: "🚚", label: "Pedidos", divider: true, module: "Pedidos" },
  { key: "ventas",      path: "/ventas",      icon: "💰", label: "Ventas", module: "PedidosVentas" },
  { key: "pagos",       path: "/pagos",       icon: "💳", label: "Pagos", module: "Pagos" },
  { key: "colores",     path: "/colores",     icon: "🎨", label: "Colores",divider: true, module: "Colores" },
];

// PERMISOS está deprecado: ahora se utilizan los módulos asignados por el backend.
export const PERMISOS = {};