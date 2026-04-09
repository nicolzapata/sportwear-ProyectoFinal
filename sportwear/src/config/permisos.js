// src/config/permisos.js

// ─── Menú completo (orden y metadatos) ──────────────────────────
export const MENU_ITEMS = [
  { key: "dashboard",   path: "/dashboard",   icon: "📊", label: "Mi panel" },
  { key: "usuarios",    path: "/usuarios",    icon: "👤", label: "Usuarios",    divider: true },
  { key: "roles",       path: "/roles",       icon: "🔑", label: "Roles" },
  { key: "clientes",    path: "/clientes",    icon: "🤝", label: "Clientes" },
  { key: "productos",   path: "/productos",   icon: "👕", label: "Productos",   divider: true },
  { key: "categorias",  path: "/categorias",  icon: "🏷️", label: "Categorías" },
  { key: "colores",     path: "/colores",     icon: "🎨", label: "Colores" },
  { key: "catalogo",    path: "/catalogo",    icon: "📋", label: "Catálogo" },
  { key: "proveedores", path: "/proveedores", icon: "🏭", label: "Proveedores", divider: true },
  { key: "compras",     path: "/compras",     icon: "📦", label: "Compras" },
  { key: "pedidos",     path: "/pedidos",     icon: "💰", label: "Pedidos y Ventas",     divider: true },
];

// ─── Permisos por rol ────────────────────────────────────────────
export const PERMISOS = {
  // ── Admin: acceso total ──────────────────────────
  Admin: [
    "dashboard",
    "roles",
    "usuarios",
    "clientes",
    "categorias",
    "productos",
    "colores",
    "catalogo",
    "proveedores",
    "compras",
    "pedidos",
  ],

  Cliente: [
    "dashboard",
    "catalogo",
    "pedidos",
  ],

  // ── Cliente: solo lo suyo ────────────────────────
  Cliente: [
    "dashboard",
    "catalogo",
    "pedidos",
    "pagos",
  ],

};