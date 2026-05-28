import { useState } from "react";
import { IconCheck, IconBan } from "./Icons";
import "./StatusToggle.css";

export default function StatusToggle({ 
  id, 
  estado, 
  onToggle, 
  disabled = false,
  disabledReason = null,
  showConfirmation = true
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    
    const nuevoEstado = estado === "Activo" ? "Inactivo" : "Activo";
    
    if (showConfirmation && estado === "Activo") {
      if (!window.confirm(`¿${nuevoEstado} este registro? Esta acción puede afectar otros registros relacionados.`)) {
        return;
      }
    }
    
    setLoading(true);
    try {
      await onToggle(id, nuevoEstado);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      alert(err.response?.data?.message || "Error al cambiar el estado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-toggle-wrapper" title={disabled && disabledReason ? disabledReason : (estado === "Activo" ? "Click para desactivar" : "Click para activar")}>
      <button
        className={`status-toggle-btn ${estado === "Activo" ? "activo" : "inactivo"} ${loading ? "loading" : ""} ${disabled ? "disabled" : ""}`}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <span className="status-toggle-spinner" />
        ) : (
          <>
            {estado === "Activo" ? <IconBan /> : <IconCheck />}
            <span className="status-toggle-text">{estado}</span>
          </>
        )}
      </button>
    </div>
  );
}