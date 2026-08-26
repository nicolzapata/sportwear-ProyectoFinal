// Constantes y funciones puras usadas por Roles.jsx.
import { MAX_LONGITUD_NOMBRE } from "../../../shared/utils/numerico";

// ── Iconos por rol ────────────────────────────────────────────────────────────
const ROLE_ICONS = {
  administrador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
      <path d="M9 11.5L6 14l1.5 1.5"/><path d="M15 11.5L18 14l-1.5 1.5"/>
    </svg>
  ),
  cliente: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
      <path d="M16 3l2 2-5 5"/>
    </svg>
  ),
  bodeguero: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M5 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
      <path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M10 12v4m4-4v4"/>
    </svg>
  ),
  vendedor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5"/>
    <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
  </svg>
);

export const PALETAS = ['#f5ede6', '#f0ebe4', '#e8f0e8', '#ede8f5', '#f5f0e0', '#e8f0f5'];

export const MODULOS_FALLBACK = [
  "Dashboard", "Usuarios", "Clientes", "Roles", "Productos", "Categorias", "Colores", "Proveedores", "Compras", "Pedidos", "Ventas", "Pagos",
];

export const esRolProtegido = (nombre = "") => {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return n === "administrador" || n === "admin";
};

// La acción "estado" (activar/desactivar) se confunde fácilmente con el
// campo "Estado" (Activo/Inactivo) del rol, así que se muestra con una
// etiqueta más clara sin tocar el nombre real de la acción en el backend.
export const ACCION_LABELS = { ver: "Ver", crear: "Crear", editar: "Editar", estado: "Cambiar estado" };
export const labelAccion = (accion = "") => ACCION_LABELS[accion] || accion;

export const validarNombreRol = (valor) => {
  const texto = (valor ?? "").trim();
  if (!texto) return "El nombre es obligatorio";
  if (texto.length > MAX_LONGITUD_NOMBRE) return `No puede tener más de ${MAX_LONGITUD_NOMBRE} caracteres.`;
  return "";
};

export const getRoleIcon = (nombre = "") => {
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return ROLE_ICONS[key] || DEFAULT_ICON;
};

export const normalizeModulo = (value) =>
  value?.toString?.().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export const mergeModulos = (backendModulos) => {
  const raw = Array.isArray(backendModulos)
    ? backendModulos.map((m) => {
        if (typeof m === 'string') return m.trim();
        if (m && typeof m === 'object') return (m.modulo || m.nombre || '').trim();
        return '';
      }).filter(Boolean)
    : [];

  const allowed = new Set(MODULOS_FALLBACK.map((modulo) => normalizeModulo(modulo)));
  const seen = new Set();
  const result = [];

  const pushIfNew = (modulo) => {
    const key = normalizeModulo(modulo);
    if (!key || seen.has(key) || !allowed.has(key)) return;
    seen.add(key);
    result.push(modulo);
  };

  MODULOS_FALLBACK.forEach((modulo) => {
    if (raw.length === 0 || raw.some((item) => normalizeModulo(item) === normalizeModulo(modulo))) {
      pushIfNew(modulo);
    }
  });
  raw.forEach((modulo) => pushIfNew(modulo));
  MODULOS_FALLBACK.forEach((modulo) => pushIfNew(modulo));

  return result;
};

export const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
