// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MENU_ITEMS } from "../config/permisos";

const MODULOS_CLIENTE = ['dashboard', 'catalogo', 'categorias'];

const normalizeModulo = (value) =>
  value?.toString?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const tieneModulosAdmin = (modulos = []) => {
  const normalizados = modulos.map(normalizeModulo).filter(Boolean);
  return normalizados.some(m => !MODULOS_CLIENTE.includes(m));
};

export default function ProtectedRoute({ children, requiredKey }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/" replace />;

  // Cliente con módulos admin → accede al panel admin normalmente
  // Cliente sin módulos admin → al catálogo
  if (usuario.rol === 'Cliente') {
    if (!tieneModulosAdmin(usuario.modulos)) {
      return <Navigate to="/catalogo" replace />;
    }
  }

  if (requiredKey) {
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