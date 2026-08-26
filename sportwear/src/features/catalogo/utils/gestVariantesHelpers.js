export const TALLAS = ["XS","S","M","L","XL","XXL","Única","28","30","32","34","36","38","40","42","44"];

// Agrupa una lista de variantes por color — mismo criterio que el chip de
// Tallas/Colores de la tabla y el modal de detalle de GestProductos: un
// chip por color con sus tallas adentro, no un chip por combinación.
export const agruparPorColor = (lista) => {
  const grupos = new Map();
  lista.forEach(v => {
    if (!grupos.has(v.id_color)) grupos.set(v.id_color, { id_color: v.id_color, color_nombre: v.color_nombre, codigo_hex: v.codigo_hex, items: [] });
    grupos.get(v.id_color).items.push({ talla: v.talla, stock: v.stock, id_variante: v.id_variante });
  });
  return [...grupos.values()];
};
