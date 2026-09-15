// Franja "Explora por categoría" — una card por categoría con la foto del
// primer producto publicado que se encuentre de esa categoría (misma lógica
// que ya arma el menú desplegable de categorías en PublicNavbar.jsx, así que
// no hace falta ninguna imagen nueva que subir ni cambio de backend). El
// nombre de la categoría solo aparece al pasar el mouse por encima.
export default function CategoriasDestacadas({ categorias, datos, onClickCategoria }) {
  const imagenPorCategoria = {};
  datos.forEach((p) => {
    if (p.categoria && !imagenPorCategoria[p.categoria] && p.imagen_principal) {
      imagenPorCategoria[p.categoria] = p.imagen_principal;
    }
  });

  const listaCategorias = (categorias || [])
    .filter((c) => c !== "Todos" && imagenPorCategoria[c]);

  if (listaCategorias.length === 0) return null;

  return (
    <section className="cat-destacadas">
      <h2 className="cat-destacadas-title">Explora por categoría</h2>
      <div className="cat-destacadas-grid">
        {listaCategorias.map((cat) => (
          <button
            key={cat}
            type="button"
            className="cat-tile"
            onClick={() => onClickCategoria(cat)}
          >
            <img src={imagenPorCategoria[cat]} alt={cat} loading="lazy" />
            <span className="cat-tile-overlay">
              <span className="cat-tile-name">{cat}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
