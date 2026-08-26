const OPCIONES = [
  { valor: "", etiqueta: "Todas" },
  { valor: "Landing", etiqueta: "Cliente" },
  { valor: "Admin", etiqueta: "Admin" },
];

// ── CORREGIDO: antes cada botón solo cambiaba de color de golpe al
// hacer clic — ahora hay una "píldora" que se desliza de una posición a
// otra con transform + transition, como un selector deslizante de verdad.
// Se arma aparte (sin tocar Usuarios.css directamente) para no arriesgarme
// a romper la pestaña real de Usuarios sin haber visto su JSX. ──
// ── NUEVO: regla con !important directa aquí — los dos intentos
// anteriores (outline en línea, luego blur() al soltar el clic) no
// bastaron, así que esto gana pase lo que pase, sin importar si el aro
// venía de "outline" o de "box-shadow" en algún estilo global. ──
export default function OrigenFilterToggle({ filtroOrigen, setFiltroOrigen, setPagina }) {
  return (
    <>
      <style>{`
        .pv-origen-btn,
        .pv-origen-btn:focus,
        .pv-origen-btn:focus-visible,
        .pv-origen-btn:active {
          outline: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>
      <div className="usuarios-filter-toggle" style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 4, bottom: 4, left: 4,
            width: "calc((100% - 8px) / 3)",
            borderRadius: 40,
            background: "var(--brown)",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            transform: `translateX(${OPCIONES.findIndex(o => o.valor === filtroOrigen) * 100}%)`,
            zIndex: 0,
          }}
        />
        {OPCIONES.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => { setFiltroOrigen(op.valor); setPagina(1); }}
            // ── NUEVO: se limpia el foco de forma imperativa (no solo por
            // CSS) — así se gana contra cualquier estilo global de
            // ":focus"/":focus-visible" que use box-shadow en vez de
            // outline, que un simple "outline: none" en línea no toca. ──
            onMouseUp={(e) => e.currentTarget.blur()}
            className="pv-origen-btn"
            style={{
              position: "relative", zIndex: 1,
              flex: 1, textAlign: "center",
              border: "none", background: "transparent",
              borderRadius: 40, padding: "0.55rem 1.2rem",
              fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500,
              color: filtroOrigen === op.valor ? "#fff" : "var(--dvna-muted)",
              cursor: "pointer", transition: "color 0.2s ease",
              outline: "none",
              boxShadow: "none",
              WebkitTapHighlightColor: "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {op.etiqueta}
          </button>
        ))}
      </div>
    </>
  );
}
