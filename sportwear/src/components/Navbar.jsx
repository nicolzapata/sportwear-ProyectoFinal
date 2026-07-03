// src/components/Navbar.jsx  —  Admin · Estilo ETHKL
import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconDashboard, IconShield, IconUsers, IconUser, IconTag,
  IconShoppingBag, IconPalette, IconBox, IconTruck,
  IconDollar, IconHeart, IconCreditCard, IconSettings,
  IconBolt, IconBell, IconLogOut, IconX
} from "./Icons";
import './Navbar.css';
import { createPortal } from "react-dom";

const titulos = {
  "/dashboard":     { label: "Dashboard",        icon: <IconDashboard /> },
  "/roles":         { label: "Roles",             icon: <IconShield /> },
  "/usuarios":      { label: "Usuarios",          icon: <IconUsers /> },
  "/clientes":      { label: "Clientes",          icon: <IconUser /> },
  "/categorias":    { label: "Categorías",        icon: <IconTag /> },
  "/productos":     { label: "Gestión Productos", icon: <IconShoppingBag /> },
  "/colores":       { label: "Colores",           icon: <IconPalette /> },
  "/catalogo":      { label: "Catálogo",          icon: <IconBox /> },
  "/proveedores":   { label: "Proveedores",       icon: <IconTruck /> },
  "/compras":       { label: "Compras",          icon: <IconShoppingBag /> },
  "/pedidos":       { label: "Pedidos",           icon: <IconTag /> },
  "/ventas":        { label: "Ventas",            icon: <IconDollar /> },
  "/pagos":         { label: "Pagos y Abonos",    icon: <IconCreditCard /> },
};

const fecha = new Date().toLocaleDateString("es-CO", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

export default function Navbar() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const { logout }  = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const current     = titulos[location.pathname] || { label: "Admin", icon: <IconBolt /> };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">

      {/* Izquierda — marca + página actual */}
      <div className="navbar-left">
        <div className="navbar-page">
          <span className="navbar-page-icon">{current.icon}</span>
          <div>
            <div className="navbar-page-label">{current.label}</div>
            <div className="navbar-page-date">{fecha}</div>
          </div>
        </div>
      </div>

      {/* Centro — vacío en admin (el sidebar ya navega) */}

      {/* Derecha — acciones + usuario */}
      <div className="navbar-right">

        <Link to="/Notificacion" className="navbar-btn" title="Notificaciones">
          <IconBell />
        </Link>


        <div className="navbar-divider" />

        <button className="navbar-btn" title="Cerrar sesión" onClick={() => setShowLogoutConfirm(true)}>
          <IconLogOut />
        </button>

      </div>

      {showLogoutConfirm && createPortal(
        <div className="navbar-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="navbar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="navbar-modal-accent" style={{ background: '#b83232' }} />
            <div className="navbar-modal-header">
              <h2 className="navbar-modal-title">Cerrar sesión</h2>
            </div>
            <div className="navbar-modal-body">
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--dvna-charcoal)', fontSize: '14px', margin: 0 }}>
                ¿Estás seguro de que deseas cerrar sesión?
              </p>
            </div>
            <div className="navbar-modal-footer">
              <button className="navbar-btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancelar</button>
              <button className="navbar-btn-danger" onClick={handleLogout}>Sí, cerrar sesión</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
}