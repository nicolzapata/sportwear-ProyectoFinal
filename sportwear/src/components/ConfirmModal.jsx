import { createPortal } from "react-dom";
import { IconAlertTriangle, IconX } from "./Icons";
import "./ConfirmModal.css";

export default function ConfirmModal({
  title = "Confirmar acción",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Sí, confirmar",
  cancelLabel = "Cancelar",
  warning = true,
}) {
  return createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-accent" style={{ background: warning ? "var(--danger)" : "var(--success)" }} />
        <div className="confirm-modal-header">
          <div>
            <h2 className="confirm-modal-title">{title}</h2>
          </div>
          <button className="confirm-modal-close" type="button" onClick={onCancel}>
            <IconX />
          </button>
        </div>
        <div className="confirm-modal-body">
          <div className="confirm-modal-icon">
            <IconAlertTriangle />
          </div>
          <div className="confirm-modal-copy">{message}</div>
        </div>
        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn-secondary" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="confirm-modal-btn-danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
