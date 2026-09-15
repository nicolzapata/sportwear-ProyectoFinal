// src/components/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import PublicNavbar from "./PublicNavbar";
import CategoriasStrip from "./public-navbar/CategoriasStrip";
import api from "../services/api";
import "./PublicLayout.css";
import "../../features/catalogo/pages/Catalogo.layout.css";
import "../../features/catalogo/pages/Catalogo.card.css";
import "../../features/catalogo/pages/Catalogo.variantes.css";
import "../../features/catalogo/pages/Catalogo.hero.css";

export default function PublicLayout() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [categorias, setCategorias] = useState(["Todos"]);

  // La franja de categorías (debajo del navbar) es fija y vive en TODAS las
  // páginas públicas, no solo en /catalogo — así que se cargan acá, una
  // sola vez, en vez de depender de que Catalogo.jsx ya las haya puesto en
  // este mismo estado (si no, la franja se veía vacía en cualquier otra
  // página visitada antes de pasar por /catalogo).
  useEffect(() => {
    api.get("/categorias")
      .then(({ data }) => {
        const nombres = (data || [])
          .filter((c) => c.estado === "Activo" && Number(c.total_productos) > 0)
          .map((c) => c.nombre);
        setCategorias(["Todos", ...nombres]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="public-layout">
      <PublicNavbar
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
      />
      <CategoriasStrip
        categorias={categorias}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
      />
      <main className="public-layout-main">
        <div className="public-layout-container">
          <Outlet context={{ busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, categorias, setCategorias }} />
        </div>
      </main>
    </div>
  );
}