export const getBrightness = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export const MAX_LONGITUD_NOMBRE_COLOR = 40;

export const mensajeErrorNombreColor = (valor) => {
  const texto = (valor ?? "").trim();
  if (!texto) return "El nombre del color es obligatorio";
  if (texto.length > MAX_LONGITUD_NOMBRE_COLOR) return `No puede tener más de ${MAX_LONGITUD_NOMBRE_COLOR} caracteres.`;
  return "";
};

export const mensajeErrorCodigoHex = (hex) => {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return "Selecciona un color válido";
  return "";
};
