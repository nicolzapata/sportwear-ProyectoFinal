// src/components/ModalDetalle.jsx
// ─── Modal de solo lectura con navegación por secciones ───────────────────
import { useState, Children } from "react";
import { createPortal } from "react-dom";
import StatusToggle from "./StatusToggle";
import "./ModalDetalle.css";

const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24 2 14l.76-3L11.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ModalDetalle({
  titulo = "Detalle",
  subtitulo,
  avatar,
  avatarColor,
  badge,
  badgeEstado,
  badgeId,
  onToggleEstado,
  pasos,
  onClose,
  onEditar,
  onCambiarEstado,
  children,
}) {
  const [paso, setPaso] = useState(0);
  const arrayHijos = Children.toArray(children);
  const total     = pasos.length;
  const esUltimo  = paso === total - 1;
  const esPrimero = paso === 0;

  return createPortal(
    <div className="md-overlay" onClick={onClose}>
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Hero ── */}
        <div className="md-hero">
          {avatar && (
            <div className="md-avatar" style={{ background: avatarColor || 'var(--dvna-charcoal, #1a1a1a)' }}>
              {avatar}
            </div>
          )}
          <div className="md-hero-info">
            {subtitulo && <h2 className="md-nombre">{subtitulo}</h2>}
            <p className="md-titulo-label">{titulo}</p>
            {badge && <div className="md-badge-wrap">{badge}</div>}
          </div>
          <button className="md-close" onClick={onClose}><IconX /></button>
        </div>

        {/* ── Stepper ── */}
        <div className="md-stepper">
          {pasos.map((nombre, i) => (
            <button
              key={i}
              className={`md-step${i === paso ? " active" : ""}${i < paso ? " done" : ""}`}
              onClick={() => setPaso(i)}
              type="button"
            >
              <span className="md-step-dot">
                {i < paso ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </span>
              <span className="md-step-label">{nombre}</span>
            </button>
          ))}
          <div className="md-progress-track">
            <div className="md-progress-fill" style={{ width: `${(paso / Math.max(total - 1, 1)) * 100}%` }} />
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="md-body">
          {arrayHijos[paso]}
        </div>

        {/* ── Footer navegación ── */}
        <div className="md-footer">
          <button className="md-btn-nav" onClick={() => setPaso(p => p - 1)} disabled={esPrimero}>
            <IconArrowLeft /> Anterior
          </button>
          <div className="md-footer-center">
            {pasos.map((_, i) => (
              <button key={i} className={`md-dot${i === paso ? " active" : ""}`} onClick={() => setPaso(i)} type="button" />
            ))}
          </div>
          <button className="md-btn-nav" onClick={() => setPaso(p => p + 1)} disabled={esUltimo}>
            Siguiente <IconArrowRight />
          </button>
        </div>

        {/* ── Barra de acciones ── */}
        <div className="md-actions">
          <button className="md-btn-cerrar" onClick={onClose}>Cerrar</button>
          {onCambiarEstado && badgeEstado && onToggleEstado && badgeId && (
            <StatusToggle 
              id={badgeId} 
              estado={badgeEstado} 
              onToggle={onToggleEstado} 
              showConfirmation={true}
            />
          )}
          {onEditar && (
            <button className="md-btn-editar" onClick={onEditar}>
              <IconEdit /> Editar
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ── Componente auxiliar: fila de dato ── */
export function DetalleItem({ label, value, full = false }) {
  return (
    <div className={`md-item${full ? " md-item-full" : ""}`}>
      <span className="md-item-label">{label}</span>
      <span className="md-item-value">
        {value ?? <span className="md-item-empty">No registrado</span>}
      </span>
    </div>
  );
}

/* ── Componente auxiliar: grid de items ── */
export function DetalleGrid({ children }) {
  return <div className="md-grid">{children}</div>;
}

/* ── Componente auxiliar: sección con título ── */
export function DetalleSeccion({ titulo, children }) {
  return (
    <div className="md-seccion">
      {titulo && <div className="md-seccion-titulo">{titulo}</div>}
      {children}
    </div>
  );
}