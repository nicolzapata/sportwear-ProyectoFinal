// src/components/Navbar.jsx  —  Admin · Estilo ETHKL
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconDashboard, IconShield, IconUsers, IconUser, IconTag,
  IconShoppingBag, IconPalette, IconBox, IconTruck,
  IconDollar, IconHeart, IconCreditCard, IconSettings,
  IconBolt, IconBell
} from "./Icons";
import './Navbar.css';

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
  "/pedidos":       { label: "Pedidos y Ventas",  icon: <IconDollar /> },
  "/promociones":   { label: "Promociones",       icon: <IconHeart /> },
  "/pagos":         { label: "Pagos y Abonos",    icon: <IconCreditCard /> },
  "/configuracion": { label: "Configuración",     icon: <IconSettings /> },
};

const fecha = new Date().toLocaleDateString("es-CO", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

export default function Navbar() {
  const location    = useLocation();
  const { usuario } = useAuth();
  const current     = titulos[location.pathname] || { label: "Admin", icon: <IconBolt /> };
  const inicial     = usuario?.nombre?.[0]?.toUpperCase() ?? "U";

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

        <Link to="/configuracion" className="navbar-btn" title="Configuración">
          <IconSettings />
        </Link>

        <div className="navbar-divider" />

        

      </div>
    </header>
  );
}