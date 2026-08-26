import { IconBoxMini, IconChevronDownSm } from "./icons";

// ── NUEVO: menú de categorías tipo mega-menú con imagen de referencia ──
export default function CategoriasMenu({
  listaCategorias, categoriasRef, filtroCategoria,
  menuCategoriasAbierto, setMenuCategoriasAbierto, imagenPorCategoria, irACategoria,
}) {
  if (listaCategorias.length === 0) return null;

  return (
    <div className="navbar-categorias-dropdown" ref={categoriasRef}>
      <button
        type="button"
        className={`navbar-link navbar-categorias-trigger${filtroCategoria !== "Todos" ? " active" : ""}`}
        onClick={() => setMenuCategoriasAbierto((v) => !v)}
        aria-expanded={menuCategoriasAbierto}
      >
        {filtroCategoria !== "Todos" ? filtroCategoria : "Categorías"}
        <span className={`navbar-categorias-chevron${menuCategoriasAbierto ? " abierto" : ""}`}>
          <IconChevronDownSm />
        </span>
      </button>

      {menuCategoriasAbierto && (
        <div className="navbar-categorias-panel">
          {listaCategorias.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`navbar-categoria-item${filtroCategoria === cat ? " activo" : ""}`}
              onClick={() => irACategoria(cat)}
            >
              <span className="navbar-categoria-img">
                {imagenPorCategoria[cat]
                  ? <img src={imagenPorCategoria[cat]} alt={cat} />
                  : <IconBoxMini />}
              </span>
              <span className="navbar-categoria-nombre">{cat}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
