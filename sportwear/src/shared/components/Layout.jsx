// src/components/Layout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./Layout.css";

export default function Layout() {
  useAuth();
  // En móvil representa el drawer del sidebar (cerrado por defecto).
  // En escritorio el sidebar siempre es visible (se expande con hover), así
  // que este estado no le afecta.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="layout-admin">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="layout-admin-content">
          <Navbar onMenuClick={() => setMobileMenuOpen((v) => !v)} />
          <main className="layout-main">
            <div className="layout-container">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}