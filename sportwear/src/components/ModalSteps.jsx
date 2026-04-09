// src/components/ModalSteps.jsx
// ─── Componente reutilizable: modal con navegación por secciones ───────────
// Uso:
//   <ModalSteps
//     titulo="Editar usuario"
//     pasos={["Cuenta", "Documentos", "Ubicación", "Rol"]}
//     onClose={() => setModal(false)}
//     onGuardar={guardar}
//     labelGuardar="Actualizar"
//   >
//     {/* paso 0 */}
//     <div>...campos...</div>
//     {/* paso 1 */}
//     <div>...campos...</div>
//   </ModalSteps>

import { useState, Children } from "react";
import { createPortal } from "react-dom";
import "./ModalSteps.css";

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

export default function ModalSteps({
  titulo,
  pasos,
  onClose,
  onGuardar,
  labelGuardar = "Guardar",
  guardando = false,
  children,
  onOverlayClick,
}) {
  const [paso, setPaso] = useState(0);
  const arrayHijos = Children.toArray(children);
  const total = pasos.length;
  const esUltimo = paso === total - 1;
  const esPrimero = paso === 0;

  const handleOverlay = () => {
    if (onOverlayClick) onOverlayClick();
    else onClose();
  };

  return createPortal(
    <div className="ms-overlay" onClick={handleOverlay}>
      <div className="ms-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="ms-header">
          <div className="ms-header-left">
            <h2 className="ms-titulo">{titulo}</h2>
            <p className="ms-subtitulo">
              Paso {paso + 1} de {total} · {pasos[paso]}
            </p>
          </div>
          <button className="ms-close" onClick={onClose}><IconX /></button>
        </div>

        {/* ── Stepper ── */}
        <div className="ms-stepper">
          {pasos.map((nombre, i) => (
            <button
              key={i}
              className={`ms-step${i === paso ? " active" : ""}${i < paso ? " done" : ""}`}
              onClick={() => setPaso(i)}
              type="button"
            >
              <span className="ms-step-dot">
                {i < paso ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="ms-step-label">{nombre}</span>
            </button>
          ))}
          {/* Línea de progreso */}
          <div className="ms-progress-track">
            <div
              className="ms-progress-fill"
              style={{ width: `${(paso / (total - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Contenido del paso actual ── */}
        <div className="ms-body">
          {arrayHijos[paso]}
        </div>

        {/* ── Footer ── */}
        <div className="ms-footer">
          <button
            className="ms-btn-secondary"
            onClick={esPrimero ? onClose : () => setPaso(p => p - 1)}
            disabled={guardando}
          >
            {esPrimero ? (
              "Cancelar"
            ) : (
              <><IconArrowLeft /> Anterior</>
            )}
          </button>

          <div className="ms-footer-right">
            {/* Puntos de navegación rápida */}
            <div className="ms-dots">
              {pasos.map((_, i) => (
                <button
                  key={i}
                  className={`ms-dot${i === paso ? " active" : ""}`}
                  onClick={() => setPaso(i)}
                  type="button"
                />
              ))}
            </div>

            {esUltimo ? (
              <button
                className="ms-btn-primary"
                onClick={onGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <><span className="ms-spinner" />{" "}Guardando...</>
                ) : (
                  labelGuardar
                )}
              </button>
            ) : (
              <button
                className="ms-btn-primary"
                onClick={() => setPaso(p => p + 1)}
              >
                Siguiente <IconArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}