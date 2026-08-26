// Funciones puras usadas por GestProductos.jsx (formateo, cálculos, agrupación).
import { IconAlertTriangle } from "../../../shared/components/Icons";

export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export const ERRORES_INICIALES = { nombre: "", id_categoria: "", precio: "", general: "" };
export const FORM_VACIO = { nombre: "", descripcion: "", id_categoria: "", precio: "", publicado: false, estado: "Activo", destacado: "" };
export const MAX_LONGITUD_NOMBRE_COLOR = 40;

// ── Medición de chips de la columna Tallas/Colores ─────────────────────────
// La columna tiene un ancho fijo (ver .gestproductos-th-variantes en el CSS);
// en vez de mostrar un número fijo de chips, se estima el ancho real de cada
// uno (canvas measureText) y se calculan cuántos caben antes de resumir el
// resto en un chip "+N más".
export const ANCHO_COL_VARIANTES = 190;
export const ANCHO_CHIP_MAS = 56;
export const ANCHO_CHIP_FIJO = 14 /* swatch */ + 6 /* gap swatch-texto */ + 20 /* padding */ + 2 /* borde */;
export const GAP_CHIPS = 6;
let medirCanvas = null;
const anchoTexto = (texto) => {
  if (typeof document === "undefined") return texto.length * 6.5;
  if (!medirCanvas) medirCanvas = document.createElement("canvas");
  const ctx = medirCanvas.getContext("2d");
  ctx.font = "500 12px Jost, sans-serif";
  return ctx.measureText(texto).width;
};
export const anchoChip = (texto) => ANCHO_CHIP_FIJO + anchoTexto(texto);

export const stockBadge = (stock) => {
  if (stock === 0) return <span className="tabla-stock agotado"><IconAlertTriangle /> Agotado</span>;
  if (stock <= 6)  return <span className="tabla-stock bajo"><IconAlertTriangle /> {stock} uds</span>;
  return <span className="tabla-stock normal">{stock} uds</span>;
};

// Agrupa las variantes de un producto por color: un solo chip por color
// con sus tallas concatenadas, en vez de un chip por combinación color+talla.
export const agruparVariantesPorColor = (variantes) => {
  const grupos = new Map();
  variantes.forEach(v => {
    if (!grupos.has(v.id_color)) grupos.set(v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex, tallas: [] });
    grupos.get(v.id_color).tallas.push(v.talla);
  });
  return [...grupos.values()];
};

// Colores blancos/muy claros necesitan un borde más marcado en el swatch
// para no perderse contra el fondo claro de la tabla.
export const esColorClaro = (hex) => {
  if (!hex || hex.length !== 7) return true;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
};

export const getBrightness = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
};
