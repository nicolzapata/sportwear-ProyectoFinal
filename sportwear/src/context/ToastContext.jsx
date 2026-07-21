// src/context/ToastContext.jsx
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

  // ── mostrarToast: usado por TODA la app. Acepta (tipo, mensaje) en el
  // mismo orden que ya usaban las páginas existentes (ej. GestProductos),
  // así que migrar una página vieja es solo cambiar de dónde viene la
  // función, sin tocar cómo se llama. ──
  const mostrarToast = useCallback((tipo, mensaje) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // ── id incremental: fuerza que React trate cada aviso como un elemento
    // nuevo (key distinta), así la animación de entrada/salida SIEMPRE se
    // reproduce de cero — incluso si haces clic varias veces seguidas con
    // el mismo tipo/mensaje. Antes, al reutilizar el mismo nodo, la
    // animación CSS ya gastada no volvía a dispararse y el aviso "no
    // aparecía" en los clics siguientes. ──
    idRef.current += 1;
    setToast({ tipo, mensaje, id: idRef.current });

    timeoutRef.current = setTimeout(() => setToast(null), DURACION_MS);
  }, []);

  const ocultarToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast, ocultarToast }}>
      {children}
      <Toast key={toast?.id ?? "sin-toast"} toast={toast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
};