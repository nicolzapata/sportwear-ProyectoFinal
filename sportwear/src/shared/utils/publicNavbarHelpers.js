export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export const MIN_CARACTERES = 2;
export const MAX_SUGERENCIAS = 6;
