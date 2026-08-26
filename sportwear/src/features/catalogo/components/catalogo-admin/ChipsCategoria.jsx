export default function ChipsCategoria({ categoriaChips, filtroCategoria, setFiltroCategoria }) {
  return (
    <div className="catadmin-chips-row">
      {categoriaChips.map((c) => (
        <button
          key={c.nombre}
          className={`catadmin-chip${filtroCategoria === c.nombre ? " active" : ""}`}
          onClick={() => setFiltroCategoria(c.nombre)}
        >
          {c.nombre} <span className="catadmin-chip-count">{c.total}</span>
        </button>
      ))}
    </div>
  );
}
