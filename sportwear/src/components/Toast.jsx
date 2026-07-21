import { createPortal } from "react-dom";
import { IconCheck, IconAlertTriangle, IconX } from "./Icons";
import "./Toast.css";

const ToastIcon = ({ type }) => {
  if (type === "success") return <IconCheck />;
  if (type === "error") return <IconAlertTriangle />;
  return <IconX />;
};

// ── CORREGIDO: distintas páginas del proyecto le pasaban a este componente
// props en español ({ tipo, mensaje }) en vez de las que esperaba ({ type,
// message }) — como nunca coincidían, salían undefined y el toast se veía
// como una cajita vacía y sin color (ninguna clase toast-success/error/...
// llegaba a aplicar). Ahora acepta cualquiera de los dos formatos, así que
// se arregla en todos los módulos de una vez, sin tener que ir página por
// página cambiando cómo cada una lo llama. ──
const TIPO_A_TYPE = {
  exito: "success", success: "success",
  error: "error",
  info: "info",
  warning: "warning", advertencia: "warning",
};

export default function Toast({ toast }) {
  if (!toast) return null;

  const type    = TIPO_A_TYPE[toast.type] || TIPO_A_TYPE[toast.tipo] || toast.type || "info";
  const message = toast.message ?? toast.mensaje ?? "";

  if (!message) return null; // nada útil que mostrar — evita la cajita vacía

  return createPortal(
    <div className={`toast toast-${type}`} role="status">
      <div className="toast-icon"><ToastIcon type={type} /></div>
      <div className="toast-message">{message}</div>
    </div>,
    document.body
  );
}