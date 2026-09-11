import { Link } from "react-router-dom";
import { IconShoppingBag, IconUser, IconLogOut } from "../Icons";
import ThemeToggle from "../ThemeToggle";

// ── Derecha: Acciones ──
export default function AccionesNavbar({ usuario, esAdmin, handleLogout, totalItems, oculto, mostrarThemeToggle }) {
  return (
    <div className="navbar-right">
      {mostrarThemeToggle && <ThemeToggle />}

      {/* ── El carrito se ve sin sesión; solo se oculta para admins. ── */}
      {!esAdmin && (
        <Link to="/carrito" className="navbar-btn" title="Carrito" style={{ position: "relative" }}>
          <IconShoppingBag />
          {!oculto && totalItems > 0 && (
            <span className="navbar-badge">{totalItems}</span>
          )}
        </Link>
      )}

      {usuario ? (
        <>
          <div className="navbar-divider" />

          <Link
            to={usuario?.rol === "Cliente" ? "/mi-cuenta" : "/dashboard"}
            className="navbar-user-link"
            title="Mi cuenta"
          >
            <span className="navbar-avatar">
              <IconUser />
            </span>
            <span className="navbar-user-name">{usuario.nombre}</span>
          </Link>

          <button className="navbar-btn" onClick={handleLogout} title="Cerrar sesión" style={{ cursor: "pointer" }}>
            <IconLogOut />
          </button>
        </>
      ) : (
        <Link to="/login" className="navbar-btn" title="Iniciar sesión">
          <IconUser />
        </Link>
      )}
    </div>
  );
}
