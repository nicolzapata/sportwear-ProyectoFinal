import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const AuthContext = createContext(null);

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos sin actividad
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
const LAST_ACTIVITY_KEY = "sz_last_activity";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem("sz_usuario");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const inactivityTimer = useRef(null);

  const login = (userData, token) => {
    localStorage.removeItem("sz_logout_motivo");
    localStorage.setItem("sz_usuario", JSON.stringify(userData));
    localStorage.setItem("sz_token", token);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setUsuario(userData);
    window.dispatchEvent(new CustomEvent("user-login", { detail: userData }));
  };

  const logout = useCallback((motivo) => {
    localStorage.removeItem("sz_usuario");
    localStorage.removeItem("sz_token");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (motivo) {
      localStorage.setItem("sz_logout_motivo", motivo);
    }
    setUsuario(null);
    window.dispatchEvent(new CustomEvent("user-logout"));
  }, []);

  // Cierra la sesión automáticamente si no hay actividad del usuario durante
  // INACTIVITY_LIMIT_MS. El aviso al volver a ingresar lo muestra SessionExpiredNotice.
  // El último momento de actividad se persiste en localStorage (no solo en un
  // timer en memoria) para poder detectar, al recargar o al volver a la
  // pestaña tras estar mucho tiempo fuera, que el límite ya se superó y
  // cerrar la sesión de inmediato en vez de reiniciar el conteo desde cero.
  useEffect(() => {
    if (!usuario) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }

    const haSuperadoElLimite = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      return !lastActivity || Date.now() - lastActivity >= INACTIVITY_LIMIT_MS;
    };

    const resetTimer = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => logout("inactividad"), INACTIVITY_LIMIT_MS);
    };

    const verificarAlVolver = () => {
      if (document.visibilityState === "visible" && haSuperadoElLimite()) {
        logout("inactividad");
      }
    };

    // Si ya se superó el límite (p.ej. la pestaña estuvo cerrada o en segundo
    // plano más tiempo del permitido), cerrar sesión de inmediato al montar.
    if (haSuperadoElLimite()) {
      logout("inactividad");
      return;
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    document.addEventListener("visibilitychange", verificarAlVolver);
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener("visibilitychange", verificarAlVolver);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [usuario, logout]);

  const actualizarUsuario = useCallback((nuevosDatos) => {
    const usuarioActualizado = { ...usuario, ...nuevosDatos };
    localStorage.setItem("sz_usuario", JSON.stringify(usuarioActualizado));
    setUsuario(usuarioActualizado);
    window.dispatchEvent(new CustomEvent("user-login", { detail: usuarioActualizado }));
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}