// src/components/ModalSteps.jsx
import { useState, useEffect, Children } from "react";
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
  step,
  onStepChange,
  onValidationFail,
  validaciones = [],
}) {
  const [paso, setPasoState] = useState(step ?? 0);
  const [validacionError, setValidacionError] = useState("");

  useEffect(() => {
    if (typeof step === 'number') {
      setPasoState(step);
    }
  }, [step]);

  useEffect(() => {
    setValidacionError("");
  }, [paso]);

  const setPaso = (value) => {
    setPasoState(value);
    if (typeof onStepChange === 'function') onStepChange(value);
  };

  const validarPaso = async (index) => {
    const validator = Array.isArray(validaciones) ? validaciones[index] : undefined;
    if (typeof validator !== 'function') {
      setValidacionError("");
      return true;
    }

    const result = await Promise.resolve(validator());
    if (result === false) {
      if (typeof onValidationFail === 'function') onValidationFail(index);
      return false;
    }

    if (typeof result === 'string' && result.trim()) {
      setValidacionError(result);
      if (typeof onValidationFail === 'function') onValidationFail(index, result);
      return false;
    }

    setValidacionError("");
    return true;
  };

  const handlePaso = async (value) => {
    if (value > paso) {
      for (let i = paso; i < value; i += 1) {
        const puedeAvanzar = await validarPaso(i);
        if (!puedeAvanzar) return;
      }
    }
    setPaso(value);
  };

  // Convierte children a array en cada render para que siempre
  // refleje las props más recientes (fix: chips no seleccionados al editar)
  const arrayHijos = Children.toArray(children);

  const total = pasos.length;
  const esUltimo = paso === total - 1;
  const esPrimero = paso === 0;
  const esMultiPaso = total > 1;

  return createPortal(
    <div className="ms-overlay">
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
              onClick={() => handlePaso(i)}
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
          <div className="ms-progress-track">
            <div
              className="ms-progress-fill"
              style={{ width: `${(paso / (total - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Contenido del paso actual ── */}
        <div className="ms-body">
          {/* Se renderiza el hijo del paso activo con sus props frescas */}
          {arrayHijos[paso]}
          {validacionError && (
            <div className="ms-validation-alert" role="alert" style={{ marginTop: 10 }}>
              {validacionError}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="ms-footer">
          <button
            type="button"
            className="ms-btn-secondary"
            onClick={() => {
              if (esMultiPaso) {
                if (!esPrimero) setPaso(p => p - 1);
              } else {
                onClose();
              }
            }}
            disabled={guardando || (esMultiPaso && esPrimero)}
          >
            {esMultiPaso ? <><IconArrowLeft /> Anterior</> : "Cancelar"}
          </button>

          <div className="ms-footer-right">
            <div className="ms-dots">
              {pasos.map((_, i) => (
                <button
                  key={i}
                  className={`ms-dot${i === paso ? " active" : ""}`}
                  onClick={() => handlePaso(i)}
                  type="button"
                />
              ))}
            </div>

            {esUltimo ? (
              <button
                type="button"
                className="ms-btn-primary"
                onClick={async () => {
                  const puedeAvanzar = await validarPaso(paso);
                  if (!puedeAvanzar) return;
                  const result = await Promise.resolve(onGuardar?.());
                  if (result === false && typeof onValidationFail === 'function') {
                    onValidationFail(paso);
                  }
                }}
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
                type="button"
                className="ms-btn-primary"
                onClick={async () => {
                  const puedeAvanzar = await validarPaso(paso);
                  if (puedeAvanzar) setPaso(p => p + 1);
                }}
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