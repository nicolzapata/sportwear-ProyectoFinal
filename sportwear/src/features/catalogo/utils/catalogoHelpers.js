// Funciones puras usadas por Catalogo.jsx y ProductCard.jsx.

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

export const extraerColores = (vars) => [
  ...new Map(
    (vars || [])
      .filter(v => v.id_color && v.color_nombre)
      .map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])
  ).values(),
];

export const tallasDeColor = (vars, id_color) =>
  [...new Set(
    (vars || [])
      .filter(v => v.id_color === id_color)
      .map(v => v.talla)
      .filter(Boolean)
  )];

export const filtrarImagenes = (imgs, id_color) => {
  if (!imgs?.length) return [];
  if (!id_color) return imgs.map(i => i.url ?? i);
  const delColor  = imgs.filter(i => i.id_color === id_color);
  if (delColor.length > 0) return delColor.map(i => i.url);
  const generales = imgs.filter(i => !i.id_color);
  return (generales.length > 0 ? generales : imgs).map(i => i.url ?? i);
};
