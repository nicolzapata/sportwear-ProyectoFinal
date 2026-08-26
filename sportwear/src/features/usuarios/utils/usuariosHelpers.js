// Funciones y constantes puras usadas por Usuarios.jsx.
import { validarEmail } from "../../../shared/utils/numerico";

export const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];
export const FILAS_POR_PAGINA = 10;
export const normalizeM = (v) => v?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// "nombre" completo (BD) -> se separa en nombres y apellidos. Con 4 o más
// palabras se asumen 2 apellidos (convención CO), así el segundo nombre no
// termina metido en el campo de apellidos.
export const dividirNombre = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 4) {
    return { nombres: partes.slice(0, -2).join(" "), apellidos: partes.slice(-2).join(" ") };
  }
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
};

// ── Validaciones usuario ──
export const errorEmailUsuario = (valor) => validarEmail(valor);

// Mismas reglas que validarPasoDatosCuenta, factorizadas para reutilizar en onBlur/onChange (validación en tiempo real).
export const revisarContrasena = (valor, editar) => {
  let msg = "";
  if (!editar && !valor) msg = "La contraseña es obligatoria";
  if (valor && valor.length < 6) msg = "La contraseña debe tener al menos 6 caracteres";
  if (valor && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(valor)) msg = "Debe contener un carácter especial (!*&#).";
  return msg;
};

// Al editar sin cambiar la contraseña, "confirmar" no aplica (ambos quedan vacíos).
export const revisarConfirmar = (valor, contrasena) => {
  if (!contrasena && !valor) return "";
  if (!valor) return "Confirma la contraseña";
  if (valor !== contrasena) return "Las contraseñas no coinciden";
  return "";
};

// ── Validaciones cliente (embebido) ──
export const errorEmailCliente = (valor) => validarEmail(valor);
export const errorCiudadCliente = (valor) => (!valor.trim() ? "La ciudad es obligatoria" : "");
export const revisarContrasenaCliente = (valor, editar) => {
  if (!editar && !valor) return "La contraseña es obligatoria";
  if (valor && valor.length < 6) return "Debe tener al menos 6 caracteres";
  if (valor && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(valor)) return "Debe contener un carácter especial (!*&#).";
  return "";
};
export const revisarConfirmarCliente = (valor, contrasena) => {
  if (!contrasena && !valor) return "";
  if (!valor) return "Confirma la contraseña";
  if (valor !== contrasena) return "Las contraseñas no coinciden";
  return "";
};
