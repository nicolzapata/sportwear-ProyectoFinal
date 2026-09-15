// src/components/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import PublicNavbar from "./PublicNavbar";
import "./PublicLayout.css";
import "../../features/catalogo/pages/Catalogo.layout.css";
import "../../features/catalogo/pages/Catalogo.card.css";
import "../../features/catalogo/pages/Catalogo.variantes.css";
import "../../features/catalogo/pages/Catalogo.hero.css";

export default function PublicLayout() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [categorias, setCategorias] = useState(["Todos"]);

  return (
    <div className="public-layout">
      <PublicNavbar
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
        categorias={categorias}
        setCategorias={setCategorias}
      />
      <main className="public-layout-main">
        <div className="public-layout-container">
          <Outlet context={{ busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, categorias, setCategorias }} />
        </div>
      </main>
    </div>
  );
}