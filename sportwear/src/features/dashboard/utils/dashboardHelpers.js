// Funciones, constantes y carga de Chart.js usadas por el Dashboard.

let chartJsLoaded = false;
let chartJsPromise = null;
export function loadChartJs() {
  if (chartJsLoaded) return Promise.resolve(window.Chart);
  if (chartJsPromise) return chartJsPromise;
  chartJsPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => { chartJsLoaded = true; resolve(window.Chart); };
    document.head.appendChild(s);
  });
  return chartJsPromise;
}

export const formatCurrency = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0);

// ── Escala el tamaño de fuente del KPI según qué tan largo sea el texto,
// para que los montos grandes ($5.008.000) nunca se salgan de la tarjeta ──
export const valueSizeClass = (texto) => {
  const len = String(texto).length;
  if (len > 12) return "stat-value-xs";
  if (len > 9)  return "stat-value-sm";
  return "";
};

export const BROWN    = "#b49780";
export const CHARCOAL = "#1a1a1a";
export const LIGHT    = "#e8e0d8";
export const MUTED    = "#888888";
export const BORDER   = "#e5e5e5";

export const hoyISO = () => new Date().toISOString().slice(0, 10);
// ── NUEVO: "2026-07-01" → "01/07/2026", para los textitos de rango
// filtrado. Se parsea el string a mano (no con new Date) para no toparse
// con el corrimiento de zona horaria de fechas "solo fecha". ──
export const formatFechaCorta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
export const getBadgeClass = (estado) => {
  switch (estado) {
    case "Pagado":    return "exito";
    case "Pendiente": return "pendiente";
    default:          return "error";
  }
};
