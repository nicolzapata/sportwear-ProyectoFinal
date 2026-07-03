import { useState } from "react";
import { IconCheck, IconX } from "./Icons";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import "./StatusToggle.css";

export default function StatusToggle({ 
  id, 
  estado, 
  onToggle, 
  disabled = false,
  disabledReason = null,
  showConfirmation = true,
  labels = { activo: "Activo", inactivo: "Inactivo" }
}) {
  const [loading, setLoading] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);
  const [toast, setToast] = useState(null);

  const handleToggle = async (nuevoEstado) => {
    setLoading(true);
    try {
      await onToggle(id, nuevoEstado);
      setToast({
        type: "exito",
        message: `Estado cambiado a "${nuevoEstado === "Activo" ? labels.activo : labels.inactivo}" correctamente.`
      });
    } catch (err) {
      console.error("Error cambiando estado:", err);
      setToast({
        type: "error",
        message: err?.response?.data?.message || "Error al cambiar el estado"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (disabled || loading) return;
    
    const nuevoEstado = estado === "Activo" ? "Inactivo" : "Activo";
    
    if (showConfirmation && estado === "Activo") {
      setPendingEstado(nuevoEstado);
      return;
    }

    handleToggle(nuevoEstado);
  };

  return (
    <>
      <button
        type="button"
        className={`status-toggle-btn ${estado === "Activo" ? "activo" : "inactivo"} ${loading ? "loading" : ""} ${disabled ? "disabled" : ""}`}
        onClick={handleClick}
        disabled={disabled || loading}
        role="switch"
        aria-checked={estado === "Activo"}
        title={disabled && disabledReason ? disabledReason : (estado === "Activo" ? `Click para ${labels.inactivo.toLowerCase()}` : `Click para ${labels.activo.toLowerCase()}`)}
      >
        <span className="status-toggle-track" />
        <span className="status-toggle-thumb">
          {loading ? <span className="status-toggle-spinner" /> : (estado === "Activo" ? <IconCheck /> : <IconX />)}
        </span>
        <span className="status-toggle-hidden-text">{estado === "Activo" ? labels.activo : labels.inactivo}</span>
      </button>

      {pendingEstado && (
        <ConfirmModal
          title={`¿${pendingEstado === "Activo" ? labels.activo : labels.inactivo} este registro?`}
          message="Esta acción puede afectar otros registros relacionados."
          onCancel={() => setPendingEstado(null)}
          onConfirm={() => {
            setPendingEstado(null);
            handleToggle(pendingEstado);
          }}
          confirmLabel={`Sí, ${(pendingEstado === "Activo" ? labels.activo : labels.inactivo).toLowerCase()}`}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}