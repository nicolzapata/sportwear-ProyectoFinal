import { Link } from "react-router-dom";
import { IconCart, IconUser, IconLogOut } from "../Icons";

// ── Derecha: Acciones ──
export default function AccionesNavbar({ usuario, esAdmin, handleLogout, totalItems, oculto }) {
  return (
    <div className="navbar-right">
      {usuario ? (
        <>
          <span style={{
            fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--dvna-charcoal)", whiteSpace: "nowrap"
          }}>
            {usuario.nombre}
          </span>
          <Link to={usuario?.rol === "Cliente" ? "/mi-cuenta" : "/dashboard"} className="navbar-btn" title="Mi cuenta">
            <IconUser />
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

      {/* ── El carrito se ve sin sesión; solo se oculta para admins. ── */}
      {!esAdmin && (
        <>
          <div className="navbar-divider" />

          <Link to="/carrito" className="navbar-btn" title="Carrito" style={{ position: "relative" }}>
            <IconCart />
            {!oculto && totalItems > 0 && (
              <span className="navbar-badge">{totalItems}</span>
            )}
          </Link>
        </>
      )}
    </div>
  );
}
