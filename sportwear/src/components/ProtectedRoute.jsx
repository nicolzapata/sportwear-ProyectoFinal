// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MENU_ITEMS } from "../config/permisos";

export default function ProtectedRoute({ children, requiredKey }) {
  const { usuario } = useAuth();

  // Sin sesión → al login
  if (!usuario) return <Navigate to="/" replace />;

  // Cliente no tiene acceso al área administrativa → al catálogo
  if (usuario.rol === 'Cliente') return <Navigate to="/catalogo" replace />;

  const normalizeModulo = (value) =>
    value?.toString?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  if (requiredKey) {
    // Dashboard siempre accesible para cualquier rol administrativo
    if (requiredKey === 'dashboard') return children;

    const item = MENU_ITEMS.find(i => i.key === requiredKey);
    const requiredModule = item?.module;

    if (requiredModule && usuario.rol !== 'Admin') {
      const usuarioModulos = Array.isArray(usuario.modulos)
        ? usuario.modulos.map((m) => normalizeModulo(m)).filter(Boolean)
        : [];
      if (!usuarioModulos.includes(normalizeModulo(requiredModule))) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
}