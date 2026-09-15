import { useNavigate, useLocation } from "react-router-dom";

// ── Fila de categorías fija justo debajo del navbar público — antes vivían
// en un desplegable ("Categorías ▾") que había que abrir para ver cuáles
// había; ahora quedan siempre visibles en una sola fila (con scroll
// horizontal si no caben todas).
export default function CategoriasStrip({ categorias, filtroCategoria, setFiltroCategoria }) {
  const navigate = useNavigate();
  const location = useLocation();

  const listaCategorias = (categorias || []).filter((cat) => cat !== "Todos");
  if (listaCategorias.length === 0) return null;

  const irACategoria = (cat) => {
    setFiltroCategoria(cat);
    // El filtro de categoría solo tiene efecto en /catalogo — si se pulsa
    // desde otra página (p. ej. Sobre nosotros) hay que navegar ahí, si no
    // parece que el link no hace nada.
    if (location.pathname !== "/catalogo" && location.pathname !== "/") {
      navigate("/catalogo");
    }
  };

  return (
    <nav className="categorias-strip" aria-label="Categorías">
      <div className="categorias-strip-inner">
        {listaCategorias.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`categorias-strip-item${filtroCategoria === cat ? " activo" : ""}`}
            onClick={() => irACategoria(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </nav>
  );
}
