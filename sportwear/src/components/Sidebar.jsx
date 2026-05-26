// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MENU_ITEMS, PERMISOS } from "../config/permisos";
import logo from "../assets/LOGO.png";
import {
  IconDashboard, IconShield, IconUsers, IconUser, IconTag,
  IconShoppingBag, IconPalette, IconBox, IconTruck, IconCart,
  IconDollar, IconHeart, IconCreditCard, IconSettings, IconLogOut
} from "./Icons";
import "./Sidebar.css";

const NAV_ICONS = {
  "/dashboard":    <IconDashboard />,
  "/roles":        <IconShield />,
  "/usuarios":     <IconUsers />,
  "/productos":    <IconShoppingBag />,
  "/colores":      <IconPalette />,
  "/catalogo":     <IconBox />,
  "/proveedores":  <IconTruck />,
  "/compras":      <IconCart />,
  "/pedidos":      <IconDollar />,
  "/promociones":  <IconHeart />,
  "/pagos":        <IconCreditCard />,
  "/configuracion":<IconSettings />,
};

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const permisosRol = PERMISOS[usuario?.rol] ?? ["dashboard"];
  const menuFiltrado = MENU_ITEMS.filter((item) =>
    permisosRol.includes(item.key)
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="Logo" className="logo-img" />
        <div className="logo-name">SPORT<span>WEAR</span></div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {menuFiltrado.map((item) => (
          <div key={item.path}>
            {item.divider && permisosRol.includes(item.key) && (
              <div className="nav-divider" />
            )}
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              title={item.label}
            >
              <span className="nav-icon">
                {NAV_ICONS[item.path] ?? <IconBox />}
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
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
  );
}