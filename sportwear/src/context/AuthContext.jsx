import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem("sz_usuario");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (userData, token) => {
    localStorage.setItem("sz_usuario", JSON.stringify(userData));
    localStorage.setItem("sz_token", token);
    setUsuario(userData);
    window.dispatchEvent(new CustomEvent("user-login", { detail: userData }));
  };

  const logout = useCallback(() => {
    localStorage.removeItem("sz_usuario");
    localStorage.removeItem("sz_token");
    setUsuario(null);
    window.dispatchEvent(new CustomEvent("user-logout"));
  }, []);

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

export function useAuth() {
  return useContext(AuthContext);
}