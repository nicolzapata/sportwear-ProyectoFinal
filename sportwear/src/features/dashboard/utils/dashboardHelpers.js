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

// Colores de las gráficas del Dashboard — Chart.js pinta en un <canvas>, así
// que no puede leer variables CSS: se define aquí una paleta fija por modo,
// espejo de --sw-* (src/shared/styles/theme.css). getChartPalette(theme)
// devuelve el juego correcto según el modo activo.
export function getChartPalette(theme) {
  return theme === "dark"
    ? {
        line: "#E2C799",
        fillFrom: "rgba(226,199,153,0.38)",
        fillTo: "rgba(226,199,153,0)",
        grid: "rgba(255,255,255,0.08)",
        ticks: "#a19a8f",
        tooltipBg: "#26272d",
        tooltipTitle: "#FAF8F5",
        tooltipBody: "#a19a8f",
        tooltipBorder: "#383941",
        donut: ["#FAF8F5", "#C8A46A", "#3a3b42"],
      }
    : {
        line: "#C8A46A",
        fillFrom: "rgba(200,164,106,0.35)",
        fillTo: "rgba(200,164,106,0)",
        grid: "#ece4d6",
        ticks: "#8a8478",
        tooltipBg: "#ffffff",
        tooltipTitle: "#202126",
        tooltipBody: "#756f66",
        tooltipBorder: "#e6dcc8",
        donut: ["#202126", "#C8A46A", "#E2C799"],
      };
}

// Compat: algunos componentes usaban estas constantes fijas directamente
// para detalles pequeños (puntos de leyenda) — se mantienen apuntando al
// tono claro por defecto; los componentes con soporte de modo oscuro real
// usan getChartPalette(theme) en su lugar.
export const BROWN    = "#C8A46A";
export const CHARCOAL = "#202126";
export const LIGHT    = "#E2C799";
export const MUTED    = "#8a8478";
export const BORDER   = "#e6dcc8";

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
