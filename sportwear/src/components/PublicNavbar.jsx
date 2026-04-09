// src/components/PublicNavbar.jsx
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { IconCart, IconUser, IconLogOut } from "./Icons";
import logo from "../assets/LOGO.png";
import "./Navbar.css";

const LINKS = [
  { to: "/catalogo",       label: "Catálogo"       },
  { to: "/novedades",      label: "Novedades"      },
  { to: "/ofertas",        label: "Ofertas"        },
  { to: "/sobre-nosotros", label: "Sobre nosotros" },
];

export default function PublicNavbar() {
  const { usuario, logout } = useAuth();
  const { totalItems, oculto } = useCart();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Admin";

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <header className="navbar">

      {/* ── Izquierda: Logo ── */}
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">
            <img src={logo} alt="SportWear logo" />
          </span>
          SportWear
        </Link>
      </div>

      {/* ── Centro: Navegación ── */}
      <nav className="navbar-center">
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Derecha: Acciones ── */}
      <div className="navbar-right">
        {usuario ? (
          <>
            <span style={{
              fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--dvna-charcoal)", whiteSpace: "nowrap"
            }}>
              {usuario.nombre}
            </span>
            <Link to="/dashboard" className="navbar-btn" title="Mi cuenta">
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

        {!esAdmin && usuario && (
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
    </header>
  );
}