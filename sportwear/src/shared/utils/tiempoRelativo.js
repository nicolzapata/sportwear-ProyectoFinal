// src/shared/utils/tiempoRelativo.js
// "hace X min/h/d" a partir de una fecha — solo formateo.
export const tiempoRelativo = (fecha) => {
  if (!fecha) return "";
  const diffMs = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias}d`;
  return new Date(fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};
