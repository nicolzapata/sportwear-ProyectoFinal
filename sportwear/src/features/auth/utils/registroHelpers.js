import { validarNumeroDocumento, validarTelefono, validarNombre, validarEmail } from "../../../shared/utils/numerico";

export const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];
export const CAMPOS_NUMERICOS = ["documento", "telefono"];

// Calcula TODOS los errores del formulario a partir de un estado dado, sin tocar el state.
export const calcularErrores = (formValue) => {
  const e = {};
  const errorNombres = validarNombre(formValue.nombres, "El nombre es obligatorio.");
  if (errorNombres) e.nombres = errorNombres;
  const errorApellidos = validarNombre(formValue.apellidos, "El apellido es obligatorio.");
  if (errorApellidos) e.apellidos = errorApellidos;
  if (!formValue.documento.trim()) e.documento = "El documento es obligatorio.";
  else {
    const errorLongitud = validarNumeroDocumento(formValue.tipo_doc, formValue.documento);
    if (errorLongitud) e.documento = errorLongitud;
  }
  const errorTelefono = validarTelefono(formValue.telefono);
  if (errorTelefono) e.telefono = errorTelefono;
  const errorEmail = validarEmail(formValue.email, "El correo es obligatorio.");
  if (errorEmail) e.email = errorEmail;
  if (!formValue.direccion.trim()) e.direccion = "La dirección es obligatoria.";
  if (!formValue.contrasena) e.contrasena = "La contraseña es obligatoria.";
  else if (formValue.contrasena.length < 6) e.contrasena = "Debe tener al menos 6 caracteres.";
  // eslint-disable-next-line no-useless-escape
  else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(formValue.contrasena)) e.contrasena = "Debe contener un carácter especial (!*&#).";
  if (!formValue.confirmar) e.confirmar = "Confirma tu contraseña.";
  else if (formValue.contrasena !== formValue.confirmar) e.confirmar = "Las contraseñas no coinciden.";
  return e;
};
