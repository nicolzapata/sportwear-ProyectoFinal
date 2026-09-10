// src/components/Sidebar.jsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MENU_ITEMS, PERMISOS } from "../utils/permisos";
import logo from "../assets/LOGO.png";
import {
  IconDashboard, IconShield, IconUsers, IconUser, IconTag,
  IconShoppingBag, IconBox, IconTruck, IconCart,
  IconDollar, IconHeart, IconLogOut, IconX,
  IconChevronLeft, IconChevronRight,
} from "./Icons";
import "./Sidebar.css";

const NAV_ICONS = {
  "/dashboard":      <IconDashboard />,
  "/roles":          <IconShield />,
  "/usuarios":       <IconUsers />,
  "/productos":      <IconShoppingBag />,
  "/catalogo-admin": <IconBox />,
  "/catalogo":       <IconTag />,
  "/proveedores":    <IconTruck />,
  "/compras":        <IconCart />,
  "/ventas":         <IconHeart />,
  "/pedidos":        <IconDollar />,
  "/mi-cuenta":      <IconUser />,
};

// Etiquetas más descriptivas para el sidebar — mismo módulo/ruta de
// siempre, solo el texto que se ve cambia. "usuarios" queda aparte porque
// ya tiene su propio texto dinámico (Usuarios/Clientes/ambos) según los
// módulos que de verdad tenga asignados el usuario.
const LABEL_EXTENDIDA = {
  dashboard: "Mi panel",
  roles: "Roles & Permisos",
  productos: "Productos & Stock",
  "catalogo-admin": "Catálogo de Colección",
  proveedores: "Proveedores & Telas",
  compras: "Compras & Insumos",
  pedidos: "Pedidos Online",
  ventas: "Ventas & Facturación",
};

// Agrupación visual del menú en secciones — mismos items de MENU_ITEMS,
// sin agregar ni quitar ninguno; una clave puede no existir en el menú
// filtrado del usuario (por permisos) y ahí simplemente no se pinta nada.
const SECCIONES = [
  { titulo: "Panel & Control",       claves: ["dashboard", "roles", "usuarios"] },
  { titulo: "Inventario & Catálogo", claves: ["productos", "catalogo-admin", "proveedores", "compras"] },
  { titulo: "Operaciones",           claves: ["pedidos", "ventas"] },
];

const MODULOS_CLIENTE = ['dashboard', 'catalogo', 'categorias'];

const normalizeModulo = (value) =>
  value?.toString?.().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

const tieneModulosAdmin = (modulos = []) => {
  const normalizados = modulos.map(normalizeModulo).filter(Boolean);
  return normalizados.some(m => !MODULOS_CLIENTE.includes(m));
};

export default function Sidebar({ isOpen = false, onClose }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState(() => localStorage.getItem("sz_sidebar_modo") || "full");

  const alternarModo = () => {
    const siguiente = modo === 'full' ? 'dock' : 'full';
    setModo(siguiente);
    localStorage.setItem("sz_sidebar_modo", siguiente);
  };

  const usuarioModulos = Array.isArray(usuario?.modulos)
    ? [...new Set(usuario.modulos.map((m) => normalizeModulo(m)).filter(Boolean))]
    : [];

  const permisosRol = usuarioModulos.length > 0
    ? usuarioModulos
    : PERMISOS[usuario?.rol] ?? ["dashboard"];

  const itemEsVisible = (item) => {
    if (item.siempreVisible) return true;
    const modulosItem = item.modules
      ? item.modules.map(normalizeModulo)
      : [normalizeModulo(item.module)];
    return modulosItem.some((m) => m && permisosRol.includes(m));
  };

  const menuFiltrado = MENU_ITEMS.filter(itemEsVisible);

  // Si es Cliente con módulos admin, agregar "Mi cuenta" al sidebar
  const esClienteConAdmin = usuario?.rol === 'Cliente' && tieneModulosAdmin(usuario?.modulos || []);

  const menuFinal = esClienteConAdmin
    ? [
        { key: 'mi-cuenta', path: '/dashboard', label: 'Mi cuenta', module: null },
        ...menuFiltrado.filter(item => item.path !== '/dashboard')
      ]
    : menuFiltrado;

  const tieneUsuariosModulo = permisosRol.includes('usuarios');
  const tieneClientesModulo = permisosRol.includes('clientes');

  const getLabel = (item) => {
    if (item.key === 'usuarios') {
      if (tieneUsuariosModulo && tieneClientesModulo) return 'Usuarios & Clientes';
      if (tieneClientesModulo) return 'Clientes';
      return 'Usuarios';
    }
    return LABEL_EXTENDIDA[item.key] || item.label;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const renderItem = (item) => (
    <div key={item.path}>
      {item.divider && itemEsVisible(item) && <div className="nav-divider" />}
      <NavLink
        to={item.path}
        className={({ isActive }) => "nav-item " + (isActive ? "active" : "")}
        title={getLabel(item)}
        onClick={onClose}
      >
        <span className="nav-icon">{NAV_ICONS[item.path] ?? <IconBox />}</span>
        <span className="nav-label">{getLabel(item)}</span>
      </NavLink>
    </div>
  );

  // Cada sección solo se pinta si al menos uno de sus items sobrevivió el
  // filtro de permisos (menuFinal) — así una sección nunca queda con
  // encabezado y sin nada debajo.
  const seccionesConItems = SECCIONES.map((s) => ({
    ...s,
    items: menuFinal.filter((item) => s.claves.includes(item.key)),
  })).filter((s) => s.items.length > 0);
  const clavesAgrupadas = SECCIONES.flatMap((s) => s.claves);
  const itemsSinSeccion = menuFinal.filter((item) => !clavesAgrupadas.includes(item.key));

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar sidebar-modo-${modo} ${isOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" className="logo-img" />
          <div className="logo-name">SPORT<span>WEAR</span></div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Cerrar menú"
            aria-label="Cerrar menú"
          >
            <IconX />
          </button>

          {/* Posicionada respecto al header (.sidebar-logo), no al sidebar
              completo ni a los ítems del menú — pestaña flotante sobre su
              borde derecho, centrada en la altura del header. */}
          <button
            type="button"
            className="sidebar-modo-btn"
            onClick={alternarModo}
            title={modo === 'full' ? "Contraer menú" : "Expandir menú"}
            aria-label={modo === 'full' ? "Contraer menú" : "Expandir menú"}
          >
            {modo === 'full' ? <IconChevronLeft /> : <IconChevronRight />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {seccionesConItems.map((s) => (
            <div key={s.titulo} className="nav-seccion">
              <div className="nav-seccion-titulo">{s.titulo}</div>
              {s.items.map(renderItem)}
            </div>
          ))}
          {itemsSinSeccion.map(renderItem)}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <div className="user-info">
              <div className="user-avatar-wrap">
                <div className="user-avatar">{(usuario?.nombre ?? "U").charAt(0).toUpperCase()}</div>
                <span className="user-online-dot" title="Sesión activa" />
              </div>
              <div className="user-text">
                <div className="user-name">{usuario?.nombre ?? "Usuario"}</div>
                <div className="user-role">{usuario?.rol ?? "—"}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
              <IconLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
