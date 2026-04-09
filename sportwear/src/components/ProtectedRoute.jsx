// src/components/ProtectedRoute.jsx
// =====================================================
// Protege rutas:
//   1. Redirige al login si no hay sesión
//   2. Redirige al dashboard si el rol no tiene permiso
// =====================================================
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PERMISOS } from "../config/permisos";

export default function ProtectedRoute({ children, requiredKey }) {
  const { usuario } = useAuth();

  // Sin sesión → al login
  if (!usuario) return <Navigate to="/" replace />;

  // Si hay clave requerida, verificar que el rol tenga permiso
  if (requiredKey) {
    const permisosRol = PERMISOS[usuario.rol] ?? ["dashboard"];
    if (!permisosRol.includes(requiredKey)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
