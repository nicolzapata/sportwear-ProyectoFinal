// Funciones y constantes puras usadas por Proveedores.jsx.
import { validarNumeroDocumento, validarNombre, validarEmail } from "../../../shared/utils/numerico";

export const FILAS_POR_PAGINA = 10;

export const FORM_VACIO = {
  tipo_persona: "Juridica",
  tipo_doc: "NIT",
  numero_doc: "",
  razon_social: "",
  nombre_comercial: "",
  nombres_contacto: "",
  apellidos_contacto: "",
  cargo_contacto: "",
  telefono_celular: "",
  email_contacto: "",
  ciudad: "",
  departamento: "",
  pais: "Colombia",
  direccion: "",
  estado: "Activo",
};

export const TIPOS_DOC_POR_PERSONA = { Juridica: ["NIT"], Natural: ["CC", "CE"] };

// "nombre_contacto" completo (BD) -> se separa en nombres y apellidos. Con 4
// o más palabras se asumen 2 apellidos (convención CO), así el segundo
// nombre no termina metido en el campo de apellidos.
export const dividirNombreContacto = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 4) {
    return { nombres_contacto: partes.slice(0, -2).join(" "), apellidos_contacto: partes.slice(-2).join(" ") };
  }
  return { nombres_contacto: partes[0] || "", apellidos_contacto: partes.slice(1).join(" ") };
};

// Validadores por campo: misma condición y mismo texto que validar(), para
// poder reutilizarlos en onBlur/onChange y mostrar errores en tiempo real.
export const validarCampoNumeroDoc = (tipoDoc, numeroDoc) => {
  if (!numeroDoc.trim()) return "El número de documento es obligatorio";
  const errorLongitud = validarNumeroDocumento(tipoDoc, numeroDoc);
  return errorLongitud || "";
};
export const validarCampoRazonSocial = (v) => (!v.trim() ? "La razón social es obligatoria" : "");
export const validarCampoNombresContacto = (v) => validarNombre(v, "El nombre de la persona de contacto es obligatorio");
export const validarCampoApellidosContacto = (v) => validarNombre(v, "El apellido de la persona de contacto es obligatorio");
export const validarCampoCiudad = (v) => (!v.trim() ? "La ciudad es obligatoria" : "");
export const validarCampoDireccion = (v) => (!v.trim() ? "La dirección es obligatoria" : "");
export const validarCampoEmail = (v) => validarEmail(v, "El correo es obligatorio");
