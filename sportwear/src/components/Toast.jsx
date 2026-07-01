import { createPortal } from "react-dom";
import { IconCheck, IconAlertTriangle, IconX } from "./Icons";
import "./Toast.css";

const ToastIcon = ({ type }) => {
  if (type === "success") return <IconCheck />;
  if (type === "error") return <IconAlertTriangle />;
  return <IconX />;
};

export default function Toast({ toast }) {
  if (!toast) return null;
  return createPortal(
    <div className={`toast toast-${toast.type || "info"}`} role="status">
      <div className="toast-icon"><ToastIcon type={toast.type} /></div>
      <div className="toast-message">{toast.message}</div>
    </div>,
    document.body
  );
}
