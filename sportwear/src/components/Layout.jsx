// src/components/Layout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";
import "./Layout.css";

export default function Layout() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "Admin";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!esAdmin) {
    return (
      <div className="layout-cliente">
        <PublicNavbar />
        <main className="layout-main">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout-admin">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`layout-admin-content ${sidebarOpen ? '' : 'collapsed'}`}>
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="layout-main">
          <div className="layout-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}