// src/utils/numerico.js
// Helpers para restringir campos a solo números en toda la app.

// Deja solo dígitos (para documentos, teléfonos, NIT, cuentas, etc. — sin signo ni decimales).
export const soloDigitos = (valor) => (valor ?? "").toString().replace(/\D/g, "");

// Deja solo dígitos y un único punto decimal (para precios, montos, cantidades con decimales).
export const soloDecimal = (valor) => {
  const limpio = (valor ?? "").toString().replace(/[^\d.]/g, "");
  const partes = limpio.split(".");
  return partes.length > 2 ? `${partes[0]}.${partes.slice(1).join("")}` : limpio;
};

// Handler listo para usar en onChange de un <input>: aplica soloDigitos al valor.
export const onChangeSoloDigitos = (setter, campo) => (e) => setter(campo, soloDigitos(e.target.value));

// Rango de longitud válido por tipo de documento (Colombia). "PP" y "Pasaporte"
// conviven porque los formularios de la app usan una u otra etiqueta según el caso.
export const RANGOS_DOCUMENTO = {
  CC:        { min: 8,  max: 10, unidad: "dígitos" },
  CE:        { min: 6,  max: 9,  unidad: "dígitos" },
  TI:        { min: 10, max: 11, unidad: "dígitos" },
  NIT:       { min: 9,  max: 10, unidad: "dígitos" },
  PP:        { min: 6,  max: 12, unidad: "caracteres" },
  Pasaporte: { min: 6,  max: 12, unidad: "caracteres" },
};

// Longitud máxima permitida para el tipo de documento dado (para usar en maxLength del input).
export const maxLongitudDocumento = (tipoDoc) => RANGOS_DOCUMENTO[tipoDoc]?.max;

// Valida que el número de documento tenga una longitud válida para su tipo.
// Devuelve un mensaje de error o "" si es válido (o si el tipo/valor está vacío).
export const validarNumeroDocumento = (tipoDoc, numeroDoc) => {
  const rango = RANGOS_DOCUMENTO[tipoDoc];
  const valor = (numeroDoc ?? "").toString().trim();
  if (!rango || !valor) return "";
  if (valor.length < rango.min || valor.length > rango.max) {
    return rango.min === rango.max
      ? `Debe tener ${rango.min} ${rango.unidad}.`
      : `Debe tener entre ${rango.min} y ${rango.max} ${rango.unidad}.`;
  }
  return "";
};

// Longitud exacta que debe tener un teléfono colombiano (celular a 10 dígitos).
export const LONGITUD_TELEFONO = 10;

// Valida que el teléfono sea obligatorio y tenga exactamente 10 dígitos.
// Devuelve un mensaje de error o "" si es válido. Usado en todos los formularios
// con campo de teléfono para que la regla sea idéntica en toda la app.
export const validarTelefono = (telefono) => {
  const valor = (telefono ?? "").toString().trim();
  if (!valor) return "El teléfono es obligatorio.";
  if (valor.length !== LONGITUD_TELEFONO) return `El teléfono debe tener ${LONGITUD_TELEFONO} dígitos.`;
  return "";
};

// Longitud mínima válida para cada palabra de un nombre (evita iniciales sueltas como "J").
export const LONGITUD_MIN_PALABRA_NOMBRE = 2;

// Topes de longitud reutilizados en toda la app — un solo lugar para ajustarlos
// y que el límite del <input maxLength> siempre coincida con el del mensaje de error.
export const MAX_LONGITUD_NOMBRE     = 60;  // nombres, apellidos, razón social, banco, etc.
export const MAX_LONGITUD_DIRECCION  = 150; // direcciones, ciudad, barrio
export const MAX_LONGITUD_TEXTO_LIBRE = 300; // observaciones, descripciones, motivos (textarea)
export const MAX_LONGITUD_CODIGO     = 30;  // números de orden, referencias cortas
export const MAX_LONGITUD_CONTRASENA = 72;  // límite práctico de bcrypt

// Valida que un nombre de persona/entidad sea obligatorio, que cada palabra tenga
// al menos LONGITUD_MIN_PALABRA_NOMBRE letras y que no supere `maxLongitud`.
// `mensajeVacio` permite reusar el texto de "obligatorio" que ya usaba cada formulario.
export const validarNombre = (valor, mensajeVacio = "El nombre es obligatorio", maxLongitud = MAX_LONGITUD_NOMBRE) => {
  const texto = (valor ?? "").toString().trim();
  if (!texto) return mensajeVacio;
  if (texto.length > maxLongitud) return `No puede tener más de ${maxLongitud} caracteres.`;
  const palabraCorta = texto.split(/\s+/).some((p) => p.length < LONGITUD_MIN_PALABRA_NOMBRE);
  if (palabraCorta) return "Cada nombre o apellido debe tener al menos 2 letras.";
  return "";
};

// Tope superior razonable para montos en COP (evita errores de tecleo tipo un
// cero de más) y validación genérica reutilizable en precios/pagos/descuentos.
export const MAX_MONTO = 999999999; // 999.999.999 COP

export const validarMonto = (valor, { requerido = true, max = MAX_MONTO, mensajeVacio = "El monto es obligatorio" } = {}) => {
  const num = Number(valor);
  if (valor === "" || valor === null || valor === undefined) return requerido ? mensajeVacio : "";
  if (Number.isNaN(num)) return "Ingresa un número válido.";
  if (num <= 0) return "Debe ser mayor a 0.";
  if (num > max) return `No puede ser mayor a ${max.toLocaleString("es-CO")}.`;
  return "";
};

// Valida un correo indicando el problema puntual (falta @, falta punto, etc.)
// en vez de un genérico "correo no válido", para que el usuario sepa qué corregir.
export const validarEmail = (valor, mensajeVacio = "El correo electrónico es obligatorio") => {
  const texto = (valor ?? "").toString().trim();
  if (!texto) return mensajeVacio;
  if (/\s/.test(texto)) return "El correo electrónico no debe contener espacios.";
  const arrobas = texto.split("@").length - 1;
  if (arrobas === 0) return "Al correo le falta el símbolo @.";
  if (arrobas > 1) return "El correo solo puede tener un símbolo @.";
  const [local, dominio] = texto.split("@");
  if (!local) return "Falta el texto antes del @.";
  if (!dominio) return "Falta el dominio después del @ (ej: gmail.com).";
  if (!dominio.includes(".")) return "Al dominio le falta el punto (ej: .com).";
  if (dominio.startsWith(".") || dominio.endsWith(".") || dominio.includes(".."))
    return "El dominio del correo no es válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return "El correo electrónico no es válido.";
  return "";
};
