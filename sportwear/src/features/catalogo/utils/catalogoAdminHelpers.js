export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

// ── CORREGIDO: mismo bug que ya se arregló en Gestión de Productos — para un
// producto con variantes, el precio real (el que se actualiza al recibir una
// Compra) vive en ProductoVariantes.precio, no en Productos.precio, así que
// mostrar "p.precio" a secas se quedaba en $0. El backend ya calcula
// precio_min/precio_max por producto; esto solo arma el texto. ──
export const precioMostrado = (p) => {
  const min = p.precio_min ?? p.precio;
  const max = p.precio_max ?? p.precio;
  if (min === null || min === undefined) return fmt(p.precio);
  if (Number(min) === Number(max)) return fmt(min);
  return `${fmt(min)} - ${fmt(max)}`;
};

export const PRODUCTOS_POR_PAGINA = 12;
export const STOCK_REFERENCIA = 40; // referencia visual para la barra de stock (100% = "bien abastecido")

export const stockPct = (stock) => Math.min(100, Math.round(((stock ?? 0) / STOCK_REFERENCIA) * 100));
export const stockClase = (stock) => stock === 0 ? "agotado" : stock < 5 ? "bajo" : stock < 15 ? "medio" : "alto";
