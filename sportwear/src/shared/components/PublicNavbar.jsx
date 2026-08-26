// src/components/PublicNavbar.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import api from "../services/api";
import { IconMenu, IconX } from "./Icons";
import logo from "../assets/LOGO.png";
// Navbar.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import "./Navbar.base.css";
import "./Navbar.responsive.css";
import "./Navbar.buscador.css";
import { MIN_CARACTERES, MAX_SUGERENCIAS } from "../utils/publicNavbarHelpers";
import CategoriasMenu from "./public-navbar/CategoriasMenu";
import BuscadorNavbar from "./public-navbar/BuscadorNavbar";
import AccionesNavbar from "./public-navbar/AccionesNavbar";

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

          <CategoriasMenu
            listaCategorias={listaCategorias}
            categoriasRef={categoriasRef}
            filtroCategoria={filtroCategoria}
            menuCategoriasAbierto={menuCategoriasAbierto}
            setMenuCategoriasAbierto={setMenuCategoriasAbierto}
            imagenPorCategoria={imagenPorCategoria}
            irACategoria={irACategoria}
          />

          <NavLink
            to="/sobre-nosotros"
            className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}
            onClick={cerrarMenuMovil}
          >
            Sobre nosotros
          </NavLink>
        </nav>
        <BuscadorNavbar
          busqueda={busqueda} setBusqueda={setBusqueda}
          filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria}
          buscadorRef={buscadorRef} inputRef={inputRef}
          sugerenciasAbiertas={sugerenciasAbiertas} setSugerenciasAbiertas={setSugerenciasAbiertas}
          setIndiceActivo={setIndiceActivo} indiceActivo={indiceActivo}
          cerrarMenuMovil={cerrarMenuMovil} handleKeyDown={handleKeyDown}
          termino={termino} sugerencias={sugerencias}
          irAProducto={irAProducto} verTodosLosResultados={verTodosLosResultados}
        />
      </div>

      <AccionesNavbar
        usuario={usuario} esAdmin={esAdmin} handleLogout={handleLogout}
        totalItems={totalItems} oculto={oculto}
      />
    </header>
  );
}
