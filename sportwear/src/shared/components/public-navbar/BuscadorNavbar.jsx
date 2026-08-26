import { IconSearch } from "../Icons";
import { IconBoxMini } from "./icons";
import { fmt, MIN_CARACTERES } from "../../utils/publicNavbarHelpers";

export default function BuscadorNavbar({
  busqueda, setBusqueda, filtroCategoria, setFiltroCategoria,
  buscadorRef, inputRef, sugerenciasAbiertas, setSugerenciasAbiertas, setIndiceActivo, indiceActivo,
  cerrarMenuMovil, handleKeyDown, termino, sugerencias, irAProducto, verTodosLosResultados,
}) {
  if (busqueda === undefined) return null;

  return (
    <div className="search-input-wrap navbar-search" ref={buscadorRef}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        className="search-input"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setSugerenciasAbiertas(true);
          setIndiceActivo(-1);
        }}
        onFocus={() => { setSugerenciasAbiertas(true); cerrarMenuMovil(); }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={sugerenciasAbiertas && termino.length >= MIN_CARACTERES}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {(busqueda || filtroCategoria !== "Todos") && (
        <button
          className="navbar-clear-btn"
          onClick={() => {
            setBusqueda("");
            setFiltroCategoria("Todos");
            setSugerenciasAbiertas(false);
          }}
          title="Limpiar filtros"
        >
          ✕
        </button>
      )}

      {/* ── Dropdown de sugerencias en vivo ── */}
      {sugerenciasAbiertas && termino.length >= MIN_CARACTERES && (
        <div className="navbar-sugerencias">
          {sugerencias.length > 0 ? (
            <>
              {sugerencias.map((p, i) => (
                <button
                  key={p.id_producto}
                  type="button"
                  className={`navbar-sugerencia-item${i === indiceActivo ? " activo" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); irAProducto(p); }}
                  onMouseEnter={() => setIndiceActivo(i)}
                >
                  <span className="navbar-sugerencia-img">
                    {p.imagen_principal
                      ? <img src={p.imagen_principal} alt={p.nombre} />
                      : <IconBoxMini />}
                  </span>
                  <span className="navbar-sugerencia-info">
                    <span className="navbar-sugerencia-nombre">{p.nombre}</span>
                    <span className="navbar-sugerencia-categoria">{p.categoria}</span>
                  </span>
                  <span className="navbar-sugerencia-precio">{fmt(p.precio)}</span>
                </button>
              ))}
              <button type="button" className="navbar-sugerencia-vertodos" onMouseDown={(e) => { e.preventDefault(); verTodosLosResultados(); }}>
                <IconSearch /> Ver todos los resultados para "{busqueda}"
              </button>
            </>
          ) : (
            <div className="navbar-sugerencia-vacio">
              No hay productos que coincidan con "{busqueda}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
