// src/components/Layout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./Layout.css";

export default function Layout() {
  useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}