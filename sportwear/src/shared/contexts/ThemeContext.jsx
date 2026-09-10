// src/shared/contexts/ThemeContext.jsx
// Modo claro/oscuro compartido por panel admin, checkout, carrito y las
// páginas de acceso (login/registro/recuperar/restablecer). El valor vive
// en localStorage y se refleja en document.body.dataset.theme — a nivel de
// <body> (no de un div del árbol React) para que también lo hereden los
// modales/toasts que se montan con createPortal(..., document.body).
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "sw_theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* localStorage no disponible */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}

// Activa el modo oscuro únicamente mientras la página/layout que la llama
// está montada — agrega `scopeClass` a <body> al montar y la quita al
// desmontar. El catálogo público nunca llama este hook, así que nunca puede
// entrar en oscuro sin importar lo que haya guardado en localStorage.
// eslint-disable-next-line react-refresh/only-export-components
export function useThemeScope(scopeClass) {
  useEffect(() => {
    document.body.classList.add(scopeClass);
    return () => document.body.classList.remove(scopeClass);
  }, [scopeClass]);
}
