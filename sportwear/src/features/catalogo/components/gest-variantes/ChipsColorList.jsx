import { IconPlus, IconX } from "./icons";

// ── Lista de chips por color (mismo lenguaje visual que "ver detalle") ──────
// Cada talla es su propio tag de solo lectura (el stock nunca se edita aquí,
// solo se ve): "×" para eliminarla; al final del chip un "+" para agregar
// otra talla a ese color.
export default function ChipsColorList({ grupos, onEliminar, onAgregarTalla }) {
  return (
    <div className="gv-chips-lista">
      {grupos.map(g => (
        <div key={g.id_color} className="gv-chip-row">
          <span className="gv-chip-row-swatch" style={{ background: g.codigo_hex || "#ccc" }} />
          <span className="gv-chip-row-nombre">{g.color_nombre}</span>
          <div className="gv-chip-row-tallas">
            {g.items.map(({ talla, stock, id_variante }) => (
              <span key={talla} className={`gv-talla-tag${stock === 0 ? " agotada" : ""}`}>
                {/* El stock solo se ve aquí — se actualiza registrando una compra en el módulo Compras. */}
                <span className="gv-talla-tag-view">
                  {talla} <span className="gv-talla-tag-stock">{stock === 0 ? "Agotado" : stock}</span>
                </span>
                <button type="button" className="gv-talla-tag-del" onClick={() => onEliminar(g, talla, id_variante)} title="Eliminar">
                  <IconX />
                </button>
              </span>
            ))}
            <button type="button" className="gv-talla-tag-add" onClick={() => onAgregarTalla(g)} title={`Agregar talla en ${g.color_nombre}`}>
              <IconPlus />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
