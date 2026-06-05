// src/components/ProtectedRoute.jsx
// =====================================================
// Protege rutas:
//   1. Redirige al login si no hay sesión
//   2. Redirige al dashboard si el rol no tiene permiso
// =====================================================
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MENU_ITEMS, PERMISOS } from "../config/permisos";

export default function ProtectedRoute({ children, requiredKey }) {
  const { usuario } = useAuth();

  // Sin sesión → al login
  if (!usuario) return <Navigate to="/" replace />;

  const normalizeModulo = (value) =>
    value?.toString?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  if (requiredKey) {
    const item = MENU_ITEMS.find(i => i.key === requiredKey);
    const requiredModule = item?.module;

    if (requiredModule) {
      if (usuario.rol !== 'Admin') {
        const usuarioModulos = Array.isArray(usuario.modulos)
          ? usuario.modulos.map((m) => normalizeModulo(m)).filter(Boolean)
          : [];
        if (!usuarioModulos.includes(normalizeModulo(requiredModule))) {
          return <Navigate to="/dashboard" replace />;
        }
      }
    } else {
      const permisosRol = PERMISOS[usuario.rol] ?? ["dashboard"];
      if (!permisosRol.includes(requiredKey)) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
}
