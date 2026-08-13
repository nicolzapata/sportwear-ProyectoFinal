import { useState } from "react";
import { IconCheck, IconX } from "./Icons";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "../context/ToastContext";
import "./StatusToggle.css";

export default function StatusToggle({
  id,
  estado,
  onToggle,
  disabled = false,
  disabledReason = null,
  showConfirmation = true,
  labels = { activo: "Activo", inactivo: "Inactivo" },
  size = "md",
  // ── NUEVO: nombre específico del registro (ej. el nombre del producto,
  // categoría, color, usuario...) — si se pasa, el mensaje de confirmación
  // dice exactamente cuál registro se va a desactivar, en vez del genérico
  // "¿Inactivar este registro?". Es opcional a propósito: en las pantallas
  // donde todavía no se le pase este prop, el mensaje sigue funcionando
  // igual que antes (no rompe nada donde no se use). ──
  nombreRegistro = null,
}) {
  const [loading, setLoading] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);
  const { mostrarToast } = useToast();

  const handleToggle = async (nuevoEstado) => {
    setLoading(true);
    try {
      await onToggle(id, nuevoEstado);
      mostrarToast(
        nuevoEstado === "Activo" ? "exito" : "info",
        `Estado cambiado a "${nuevoEstado === "Activo" ? labels.activo : labels.inactivo}" correctamente.`
      );
    } catch (err) {
      console.error("Error cambiando estado:", err);
      mostrarToast("error", err?.response?.data?.message || "Error al cambiar el estado.");
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

  // ── Título con el nombre específico cuando se pasa nombreRegistro,
  // ej. "¿Deseas inactivar a Sofía Suaza?" en vez de "¿Deseas inactivar este registro?". ──
  const verboAccion = pendingEstado === "Activo" ? "activar" : "inactivar";
  const tituloConfirmacion = nombreRegistro
    ? `¿Deseas ${verboAccion} "${nombreRegistro}"?`
    : `¿Deseas ${verboAccion} este registro?`;

  return (
    <>
      <button
        type="button"
        className={`status-toggle-btn ${size === "sm" ? "status-toggle-btn--sm" : ""} ${estado === "Activo" ? "activo" : "inactivo"} ${loading ? "loading" : ""} ${disabled ? "disabled" : ""}`}
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
          title={tituloConfirmacion}
          message="Esta acción puede afectar otros registros relacionados."
          onCancel={() => setPendingEstado(null)}
          onConfirm={() => {
            setPendingEstado(null);
            handleToggle(pendingEstado);
          }}
          confirmLabel={`Sí, ${verboAccion}`}
        />
      )}
    </>
  );
}