// src/components/PublicNavbar.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import api from "../services/api";
import { IconCart, IconUser, IconLogOut, IconSearch, IconMenu, IconX } from "./Icons";
import logo from "../assets/LOGO.png";
import "./Navbar.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const IconBoxMini = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="m9 9 6 6m0-6-6 6"/>
  </svg>
);
// ── NUEVO: flechita del disparador del menú de categorías ──
const IconChevronDownSm = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MIN_CARACTERES = 2;
const MAX_SUGERENCIAS = 6;

export default function PublicNavbar({ busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, categorias }) {
  const { usuario, logout } = useAuth();
  const { totalItems, oculto } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const esAdmin = usuario?.rol === "Admin";

  // ── NUEVO (HU 04.2.9): sugerencias en vivo mientras se escribe en el buscador ──
  const [productos, setProductos] = useState([]);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const buscadorRef = useRef(null);
  const inputRef = useRef(null);

  // ── NUEVO: menú de categorías tipo "mega menú" — antes cada categoría era
  // un botón suelto en la barra, que se desbordaba al agregar más. Ahora
  // vive en un desplegable único, con una imagen de referencia por
  // categoría (tomada del primer producto que se encuentre de cada una). ──
  const [menuCategoriasAbierto, setMenuCategoriasAbierto] = useState(false);
  const categoriasRef = useRef(null);

  // Menú móvil: en pantallas angostas, los links + categorías + buscador
  // viven en este panel colapsable en vez de desaparecer con display:none.
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const cerrarMenuMovil = () => setMenuMovilAbierto(false);

  useEffect(() => {
    // Se carga una sola vez: el catálogo público no cambia tan seguido como
    // para justificar pedirlo de nuevo en cada tecla — se filtra en el cliente.
    // ── CORREGIDO: "?publicado=1" solo filtra por el campo `publicado`, pero
    // un producto puede estar publicado y aun así Inactivo (por ejemplo, se
    // agotó o el admin lo desactivó manualmente) — ese no debería aparecer ni
    // en sugerencias de búsqueda ni como imagen de referencia de categoría.
    // Mismo filtro que ya usa Catalogo.jsx para decidir qué es "visible". ──
    api.get("/productos?publicado=1")
      .then(({ data }) => setProductos((data || []).filter(p => p.publicado && p.estado === "Activo")))
      .catch(() => setProductos([]));
  }, []);

  useEffect(() => {
    const cerrar = (e) => {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target)) {
        setSugerenciasAbiertas(false);
      }
      if (categoriasRef.current && !categoriasRef.current.contains(e.target)) {
        setMenuCategoriasAbierto(false);
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  // ── NUEVO: una imagen de referencia por categoría, tomada del primer
  // producto publicado que se encuentre de esa categoría con foto. ──
  const imagenPorCategoria = useMemo(() => {
    const map = {};
    productos.forEach((p) => {
      if (p.categoria && !map[p.categoria] && p.imagen_principal) {
        map[p.categoria] = p.imagen_principal;
      }
    });
    return map;
  }, [productos]);

  const listaCategorias = (categorias || []).filter((cat) => cat !== "Todos");

  const irACategoria = (cat) => {
    setFiltroCategoria(cat);
    setMenuCategoriasAbierto(false);
    cerrarMenuMovil();
    // Los filtros de categoría solo tienen efecto en /catalogo — si el
    // usuario los pulsa desde otra página (p. ej. Sobre nosotros) hay
    // que navegar ahí, si no parece que el link no hace nada.
    if (location.pathname !== "/catalogo" && location.pathname !== "/") {
      navigate("/catalogo");
    }
  };

  const termino = busqueda.trim().toLowerCase();
  const sugerencias = termino.length >= MIN_CARACTERES
    ? productos
        .filter(p => p.nombre?.toLowerCase().includes(termino) || p.codigo?.toLowerCase().includes(termino))
        .slice(0, MAX_SUGERENCIAS)
    : [];

  const handleLogout = () => { logout(); navigate("/"); };

  const irAProducto = (p) => {
    setSugerenciasAbiertas(false);
    setBusqueda("");
    cerrarMenuMovil();
    navigate(`/catalogo/${p.id_producto}`);
  };

  const verTodosLosResultados = () => {
    setSugerenciasAbiertas(false);
    inputRef.current?.blur();
    cerrarMenuMovil();
    navigate("/catalogo");
  };

  const handleKeyDown = (e) => {
    if (!sugerenciasAbiertas || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceActivo((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceActivo((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indiceActivo >= 0 && sugerencias[indiceActivo]) irAProducto(sugerencias[indiceActivo]);
      else verTodosLosResultados();
    } else if (e.key === "Escape") {
      setSugerenciasAbiertas(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="navbar navbar--public-fixed">

      {/* ── Izquierda: Logo + hamburguesa (solo visible en móvil) ── */}
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">
            <img src={logo} alt="SportWear logo" />
          </span>
          SportWear
        </Link>
        <button
          type="button"
          className="navbar-menu-btn"
          onClick={() => setMenuMovilAbierto((v) => !v)}
          title={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-label={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuMovilAbierto}
        >
          {menuMovilAbierto ? <IconX /> : <IconMenu />}
        </button>
      </div>

      {menuMovilAbierto && (
        <div className="navbar-mobile-backdrop" onClick={cerrarMenuMovil} aria-hidden="true" />
      )}

      {/* ── Centro: Links + Filtros ── */}
      <div className={`navbar-center ${menuMovilAbierto ? "navbar-center-mobile-open" : ""}`}>
        <nav className="navbar-nav">
          <Link
            to="/catalogo"
            className={`navbar-link`}
            onClick={() => {
              setBusqueda("");
              setFiltroCategoria("Todos");
              cerrarMenuMovil();
            }}
          >
            Inicio
          </Link>

          {/* ── NUEVO: menú de categorías tipo mega-menú con imagen de referencia ── */}
          {listaCategorias.length > 0 && (
            <div className="navbar-categorias-dropdown" ref={categoriasRef}>
              <button
                type="button"
                className={`navbar-link navbar-categorias-trigger${filtroCategoria !== "Todos" ? " active" : ""}`}
                onClick={() => setMenuCategoriasAbierto((v) => !v)}
                aria-expanded={menuCategoriasAbierto}
              >
                {filtroCategoria !== "Todos" ? filtroCategoria : "Categorías"}
                <span className={`navbar-categorias-chevron${menuCategoriasAbierto ? " abierto" : ""}`}>
                  <IconChevronDownSm />
                </span>
              </button>

              {menuCategoriasAbierto && (
                <div className="navbar-categorias-panel">
                  {listaCategorias.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`navbar-categoria-item${filtroCategoria === cat ? " activo" : ""}`}
                      onClick={() => irACategoria(cat)}
                    >
                      <span className="navbar-categoria-img">
                        {imagenPorCategoria[cat]
                          ? <img src={imagenPorCategoria[cat]} alt={cat} />
                          : <IconBoxMini />}
                      </span>
                      <span className="navbar-categoria-nombre">{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <NavLink
            to="/sobre-nosotros"
            className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}
            onClick={cerrarMenuMovil}
          >
            Sobre nosotros
          </NavLink>
        </nav>
        {busqueda !== undefined && (
          <div className="search-input-wrap navbar-search" ref={buscadorRef}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setSugerenciasAbiertas(true);
                setIndiceActivo(-1);
              }}
              onFocus={() => { setSugerenciasAbiertas(true); cerrarMenuMovil(); }}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={sugerenciasAbiertas && termino.length >= MIN_CARACTERES}
              aria-autocomplete="list"
              autoComplete="off"
            />
            {(busqueda || filtroCategoria !== "Todos") && (
              <button
                className="navbar-clear-btn"
                onClick={() => {
                  setBusqueda("");
                  setFiltroCategoria("Todos");
                  setSugerenciasAbiertas(false);
                }}
                title="Limpiar filtros"
              >
                ✕
              </button>
            )}

            {/* ── Dropdown de sugerencias en vivo ── */}
            {sugerenciasAbiertas && termino.length >= MIN_CARACTERES && (
              <div className="navbar-sugerencias">
                {sugerencias.length > 0 ? (
                  <>
                    {sugerencias.map((p, i) => (
                      <button
                        key={p.id_producto}
                        type="button"
                        className={`navbar-sugerencia-item${i === indiceActivo ? " activo" : ""}`}
                        onMouseDown={(e) => { e.preventDefault(); irAProducto(p); }}
                        onMouseEnter={() => setIndiceActivo(i)}
                      >
                        <span className="navbar-sugerencia-img">
                          {p.imagen_principal
                            ? <img src={p.imagen_principal} alt={p.nombre} />
                            : <IconBoxMini />}
                        </span>
                        <span className="navbar-sugerencia-info">
                          <span className="navbar-sugerencia-nombre">{p.nombre}</span>
                          <span className="navbar-sugerencia-categoria">{p.categoria}</span>
                        </span>
                        <span className="navbar-sugerencia-precio">{fmt(p.precio)}</span>
                      </button>
                    ))}
                    <button type="button" className="navbar-sugerencia-vertodos" onMouseDown={(e) => { e.preventDefault(); verTodosLosResultados(); }}>
                      <IconSearch /> Ver todos los resultados para "{busqueda}"
                    </button>
                  </>
                ) : (
                  <div className="navbar-sugerencia-vacio">
                    No hay productos que coincidan con "{busqueda}".
                  </div>
                )}
              </div>
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
    </header>
  );
}