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
