// src/context/ToastContext.jsx
// Reemplaza los alert()/window.alert() nativos del navegador por una
// notificación propia de la aplicación, consistente en toda la página.
import { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

// Duración visible antes de que empiece a desvanecerse (debe coincidir con
// el "3.2s" del keyframe toastOut en Toast.css).
const DURACION_MS = 3500;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const idRef = useRef(0);
  const timeoutRef = useRef(null);

  // ── showToast: usado por TODA la app como `useToast()(tipo, mensaje)` o
  // `const showToast = useToast()`. El id incremental fuerza que React trate
  // cada aviso como un elemento nuevo (key distinta), así la animación de
  // entrada/salida SIEMPRE se reproduce de cero — incluso si haces clic
  // varias veces seguidas con el mismo tipo/mensaje. ──
  const showToast = useCallback((type, message) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    idRef.current += 1;
    setToast({ type, message, id: idRef.current });
    timeoutRef.current = setTimeout(() => setToast(null), DURACION_MS);
  }, []);

  const ocultarToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  // El valor del contexto es la función misma (compatibilidad con
  // `const showToast = useToast(); showToast(tipo, mensaje)`), pero también
  // expone mostrarToast/ocultarToast como propiedades para el código que
  // hace `const { mostrarToast } = useToast()`.
  showToast.mostrarToast = showToast;
  showToast.ocultarToast = ocultarToast;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast key={toast?.id ?? "sin-toast"} toast={toast} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
