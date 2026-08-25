// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MENU_ITEMS, PERMISOS } from "../utils/permisos";
import logo from "../assets/LOGO.png";
import {
  IconDashboard, IconShield, IconUsers, IconUser, IconTag,
  IconShoppingBag, IconBox, IconTruck, IconCart,
  IconDollar, IconHeart, IconCreditCard, IconSettings, IconLogOut, IconX,
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
  "/pagos":          <IconCreditCard />,
  "/mi-cuenta":      <IconUser />,
};

const MODULOS_CLIENTE = ['dashboard', 'catalogo', 'categorias'];

const normalizeModulo = (value) =>
  value?.toString?.().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const tieneModulosAdmin = (modulos = []) => {
  const normalizados = modulos.map(normalizeModulo).filter(Boolean);
  return normalizados.some(m => !MODULOS_CLIENTE.includes(m));
};

export default function Sidebar({ isOpen = false, onClose }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

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
      if (tieneUsuariosModulo && tieneClientesModulo) return 'Usuarios';
      if (tieneClientesModulo) return 'Clientes';
      return 'Usuarios';
    }
    return item.label;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? "sidebar-mobile-open" : ""}`}>
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
        </div>

        <nav className="sidebar-nav">
          {menuFinal.map((item) => (
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
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(usuario?.nombre ?? "U").charAt(0).toUpperCase()}</div>
            <div className="user-text">
              <div className="user-name">{usuario?.nombre ?? "Usuario"}</div>
              <div className="user-role">{usuario?.rol ?? "—"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <IconLogOut />
          </button>
        </div>
      </aside>
    </>
  );
}