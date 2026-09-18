// src/utils/edad.js
const EDAD_MINIMA_COMPRA = 18;

// Calcula la edad en años cumplidos a partir de una fecha de nacimiento (string 'YYYY-MM-DD' o Date).
// Devuelve null si la fecha es inválida.
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mesDiff = hoy.getUTCMonth() - nacimiento.getUTCMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
};

module.exports = { calcularEdad, EDAD_MINIMA_COMPRA };
