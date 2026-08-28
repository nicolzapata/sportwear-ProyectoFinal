import { useRef, useState, useLayoutEffect } from "react";
import "./FilterToggle.css";

// Selector deslizante genérico de pestañas — reutilizable para cualquier
// filtro de 2 o más opciones que deba verse como una "píldora" en vez de
// un <select>. Usado hoy en Pagos (3 opciones cortas) y Pedidos (6 opciones,
// algunas largas como "Todos los estados" o "En preparación").
//
// ── CORREGIDO: la primera versión asumía que todas las opciones medían lo
// mismo (ancho = 100%/N) y usaba esa fracción tanto para el tamaño de cada
// botón como para la píldora que resalta la opción activa. Eso se veía bien
// con 3 opciones cortas (Pagos), pero con 6 opciones de largo distinto
// (Pedidos) el texto más largo quedaba recortado. Ahora cada botón mide lo
// que necesite su propio texto (sin achicarse) y la píldora activa se
// posiciona midiendo el botón real en el DOM, así funciona igual de bien
// con cualquier cantidad de opciones de cualquier largo. ──
export default function FilterToggle({ opciones, valor, onChange }) {
  const btnRefs = useRef([]);
  const [thumb, setThumb] = useState(null);

  useLayoutEffect(() => {
    const idx = opciones.findIndex((o) => o.valor === valor);
    const btn = btnRefs.current[idx];
    if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [valor, opciones]);

  return (
    <div className="filter-toggle">
      {thumb && (
        <div
          className="filter-toggle-thumb"
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
        />
      )}
      {opciones.map((op, i) => (
        <button
          key={op.valor}
          ref={(el) => { btnRefs.current[i] = el; }}
          type="button"
          onClick={() => onChange(op.valor)}
          onMouseUp={(e) => e.currentTarget.blur()}
          className={`filter-toggle-btn${valor === op.valor ? " active" : ""}`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}
