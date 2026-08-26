import { validarNumeroDocumento, validarNombre, validarEmail } from "../../../shared/utils/numerico";

export const FORM_VACIO = { nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "", ciudad: "Medellín", id_barrio: "", direccion: "", contrasena: "", confirmar: "", permiso_cuotas: 0, estado: "Activo" };

// "nombre" completo (BD) -> primer palabra = nombres, resto = apellidos.
export const dividirNombre = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
};

export const errorNombres = (valor) => validarNombre(valor, "El nombre es obligatorio");
export const errorApellidos = (valor) => validarNombre(valor, "El apellido es obligatorio");
export const errorDocumento = (tipoDoc, valor) => {
  if (!valor.trim()) return "El documento es obligatorio";
  return validarNumeroDocumento(tipoDoc, valor);
};
export const errorCiudad = (valor) => (!valor.trim() ? "La ciudad es obligatoria" : "");
export const errorEmail = (valor) => validarEmail(valor, "El correo es obligatorio");
// Al editar, dejar la contraseña vacía significa "no cambiarla"; al crear sigue siendo obligatoria.
export const errorContrasena = (valor, editar) => {
  if (!editar && !valor) return "La contraseña es obligatoria";
  if (!valor) return "";
  if (valor.length < 6) return "Debe tener al menos 6 caracteres";
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(valor)) return "Debe contener un carácter especial (!*&#).";
  return "";
};
export const errorConfirmar = (valor, contrasena) => {
  if (!contrasena && !valor) return "";
  if (!valor) return "Confirma la contraseña";
  if (valor !== contrasena) return "Las contraseñas no coinciden";
  return "";
};
