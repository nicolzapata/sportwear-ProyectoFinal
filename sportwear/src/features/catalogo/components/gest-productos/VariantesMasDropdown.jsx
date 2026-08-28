import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { esColorClaro } from "../../utils/gestProductosHelpers.jsx";

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Celda Tallas/Colores: solo círculos de color, sin texto. Al hacer clic
// en cualquiera (mismo patrón visual que el dropdown de estado de Compras)
// se abre, vía portal a document.body, un panel con el detalle completo
// (tallas + stock) de TODOS los colores del producto — no solo los que no
// entraron como círculo — así no queda recortado por el overflow de la
// tabla ni por el ancho fijo de la celda. ──
export default function VariantesMasDropdown({ visibles, grupos, restantes, abierto, onToggle, productoId }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width, arriba: false });
  }, [abierto]);

  // Si el trigger está en una de las últimas filas, el panel abierto hacia
  // abajo no entra en pantalla y queda cortado. Una vez que el panel ya está
  // en el DOM (y por lo tanto se puede medir su alto real), si no entra
  // debajo del trigger se reposiciona arriba — mismo criterio que usan los
  // selects/autocompletes nativos. useLayoutEffect corre antes del paint
  // para que no se note el reacomodo.
  useLayoutEffect(() => {
    if (!abierto || !coords || coords.arriba || !panelRef.current || !btnRef.current) return;
    const panelAlto = panelRef.current.getBoundingClientRect().height;
    const r = btnRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - r.bottom;
    if (panelAlto + 12 > espacioAbajo) {
      setCoords({ top: r.top - panelAlto - 6, left: r.left, width: r.width, arriba: true });
    }
  }, [abierto, coords]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) onToggle(null);
    };
    const cerrarPorScroll = () => onToggle(null);
    document.addEventListener('mousedown', cerrar);
    window.addEventListener('scroll', cerrarPorScroll, true);
    window.addEventListener('resize', cerrarPorScroll);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      window.removeEventListener('scroll', cerrarPorScroll, true);
      window.removeEventListener('resize', cerrarPorScroll);
    };
  }, [abierto, onToggle]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="gestproductos-variantes-cell"
        onClick={() => onToggle(abierto ? null : productoId)}
        title="Ver tallas y stock por color"
        aria-label="Ver tallas y stock por color"
      >
        {visibles.map(g => {
          const swatchStyle = esColorClaro(g.codigo_hex)
            ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
            : { background: g.codigo_hex || "#ccc" };
          return <span key={g.id_color} className="gestproductos-variante-circulo" style={swatchStyle} />;
        })}
        {restantes > 0 && <span className="gestproductos-variante-circulo gestproductos-variante-mas">+{restantes}</span>}
        <span className={`gestproductos-variantes-chevron${abierto ? ' abierto' : ''}`}><IconChevronDown /></span>
      </button>

      {abierto && coords && createPortal(
        <div
          ref={panelRef}
          className="gestproductos-variantes-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {grupos.map(g => (
            <div key={g.id_color} className="gestproductos-variantes-panel-item">
              <span className="gestproductos-variantes-panel-dot" style={{ background: g.codigo_hex || "#ccc" }} />
              <span className="gestproductos-variantes-panel-label">{g.nombre}: {g.texto}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
