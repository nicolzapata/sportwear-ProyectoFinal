// src/components/PublicNavbar.jsx
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { IconCart, IconUser, IconLogOut, IconSearch } from "./Icons";
import logo from "../assets/LOGO.png";
import "./Navbar.css";

export default function PublicNavbar({ busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, categorias }) {
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

      {/* ── Centro: Links + Filtros ── */}
      <div className="navbar-center">
        <nav className="navbar-nav">
          <Link
            to="/catalogo"
            className={`navbar-link`}
            onClick={() => {
              setBusqueda("");
              setFiltroCategoria("Todos");
            }}
          >
            Inicio
          </Link>
          {categorias && categorias.filter(cat => cat !== "Todos").map((cat) => (
            <button
              key={cat}
              className={`navbar-link${filtroCategoria === cat ? " active" : ""}`}
              onClick={() => setFiltroCategoria(cat)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {cat}
            </button>
          ))}
          <NavLink
            to="/sobre-nosotros"
            className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}
          >
            Sobre nosotros
          </NavLink>
        </nav>
        {busqueda !== undefined && (
          <div className="search-input-wrap navbar-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {(busqueda || filtroCategoria !== "Todos") && (
              <button
                className="navbar-clear-btn"
                onClick={() => {
                  setBusqueda("");
                  setFiltroCategoria("Todos");
                }}
                title="Limpiar filtros"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

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