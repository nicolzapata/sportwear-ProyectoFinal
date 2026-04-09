// src/components/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";
import "./PublicLayout.css"; // Importamos el CSS

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicNavbar />
      <main className="public-layout-main">
        <div className="public-layout-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}