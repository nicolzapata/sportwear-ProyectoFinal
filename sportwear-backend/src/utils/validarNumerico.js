// src/utils/validarNumerico.js
// Valida que un valor contenga únicamente dígitos (documentos, teléfonos, NIT, cuentas, etc.)
const esSoloDigitos = (valor) => valor === undefined || valor === null || valor === '' || /^\d+$/.test(String(valor));

// Lanza un error 400 con mensaje claro si alguno de los campos indicados no es solo dígitos.
// campos: { nombreCampoParaElUsuario: valor }
const validarCamposNumericos = (campos) => {
  for (const [nombre, valor] of Object.entries(campos)) {
    if (!esSoloDigitos(valor)) {
      throw { status: 400, message: `El campo "${nombre}" solo debe contener números.` };
    }
  }
};

module.exports = { esSoloDigitos, validarCamposNumericos };
