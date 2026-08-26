export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export const PRODUCTOS_POR_PAGINA = 12;
export const STOCK_REFERENCIA = 40; // referencia visual para la barra de stock (100% = "bien abastecido")

export const stockPct = (stock) => Math.min(100, Math.round(((stock ?? 0) / STOCK_REFERENCIA) * 100));
export const stockClase = (stock) => stock === 0 ? "agotado" : stock < 5 ? "bajo" : stock < 15 ? "medio" : "alto";
