// Filtros de la pestaña "Productos" — por categoría (chips) y bajo stock,
// mismo criterio visual que el catálogo admin (CatalogoAdmin.jsx).
export default function ProductosFiltros({ categorias, filtroCategoria, setFiltroCategoria, filtroBajoStock, setFiltroBajoStock }) {
  return (
    <div className="gestproductos-filtros-row">
      <div className="gestproductos-chips-row">
        <button
          className={`gestproductos-chip${filtroCategoria === "" ? " active" : ""}`}
          onClick={() => setFiltroCategoria("")}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id_categoria}
            className={`gestproductos-chip${filtroCategoria === String(c.id_categoria) ? " active" : ""}`}
            onClick={() => setFiltroCategoria(String(c.id_categoria))}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="gestproductos-estado-tabs">
        <button className={`gestproductos-estado-tab${!filtroBajoStock ? " active" : ""}`} onClick={() => setFiltroBajoStock(false)}>Todos</button>
        <button className={`gestproductos-estado-tab${filtroBajoStock ? " active" : ""}`} onClick={() => setFiltroBajoStock(true)}>Bajo stock</button>
      </div>
    </div>
  );
}
