// Funciones puras usadas por GestProductos.jsx (formateo, cálculos, agrupación).
import { IconAlertTriangle } from "../../../shared/components/Icons";

export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

// ── NUEVO: precio a mostrar en la tabla/detalle — antes se mostraba
// "p.precio" a secas, que solo es el precio de RESPALDO para productos sin
// variantes. Para un producto con variantes (el caso normal), el precio de
// venta real vive en cada variante (ProductoVariantes.precio, actualizado
// al recibir una compra) — "p.precio" se queda en $0 para siempre y el
// admin veía "el precio no cambió, quedó en 0" aunque sí se había
// actualizado, solo que en otro campo. El backend ya calcula precio_min y
// precio_max (con el mismo respaldo a p.precio si una variante no tiene
// precio propio); esto solo arma el texto: un solo valor si todas las
// variantes venden igual, o un rango si difieren entre sí. ──
export const precioMostrado = (p) => {
  const min = p.precio_min ?? p.precio;
  const max = p.precio_max ?? p.precio;
  if (min === null || min === undefined) return fmt(p.precio);
  if (Number(min) === Number(max)) return fmt(min);
  return `${fmt(min)} - ${fmt(max)}`;
};

export const ERRORES_INICIALES = { nombre: "", id_categoria: "", precio: "", general: "" };
export const FORM_VACIO = { nombre: "", descripcion: "", id_categoria: "", precio: "", publicado: false, estado: "Activo", destacado: "" };
export const MAX_LONGITUD_NOMBRE_COLOR = 40;

// ── Layout de círculos de la columna Tallas/Colores ────────────────────────
// La columna solo muestra un círculo de color por variante (sin texto): el
// detalle de tallas/stock se ve al desplegar. Con tamaño fijo por círculo,
// alcanza con dividir el ancho de la columna para saber cuántos caben antes
// de resumir el resto en un círculo "+N". Se reserva aparte el espacio de la
// flechita que indica que la celda se puede desplegar.
export const ANCHO_COL_VARIANTES = 190;
export const ANCHO_CIRCULO = 22;
export const ANCHO_CHEVRON = 18;
export const GAP_CHIPS = 6;

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
