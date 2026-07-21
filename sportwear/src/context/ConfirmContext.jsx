// src/context/ConfirmContext.jsx
// Reemplaza los window.confirm() nativos del navegador por un modal propio
// de la aplicación (ConfirmModal), consistente en toda la página.
import { createContext, useContext, useState, useCallback } from "react";
import ConfirmModal from "../components/ConfirmModal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);

  const confirmar = useCallback((opts) => {
    if (typeof opts === "string") opts = { message: opts };
    return new Promise((resolve) => {
      setConfig({ ...opts, resolve });
    });
  }, []);

  const cerrar = (resultado) => {
    config?.resolve?.(resultado);
    setConfig(null);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {config && (
        <ConfirmModal
          title={config.title}
          message={config.message}
          confirmLabel={config.confirmLabel}
          cancelLabel={config.cancelLabel}
          warning={config.warning}
          onConfirm={() => cerrar(true)}
          onCancel={() => cerrar(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}
