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
