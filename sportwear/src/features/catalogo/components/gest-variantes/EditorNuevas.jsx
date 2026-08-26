import { TALLAS } from "../../utils/gestVariantesHelpers";
import { IconCheck, IconInfo } from "./icons";

// ── Subcomponente reutilizable: editor de nuevas variantes (matriz) ──────────
// El stock NUNCA se pide aquí: toda combinación nueva nace con stock 0 y solo
// aumenta al registrar una compra en el módulo Compras (tanto al crear un
// producto como al agregarle tallas/colores nuevos después).
export default function EditorNuevas({ colores, coloresSel, toggleColor, tallasSel, toggleTalla, onGuardar, labelGuardar, guardando, colorBloqueado, tallasBloqueadas = [] }) {
  const tallaStepNum = colorBloqueado ? 1 : 2;
  const resumenStepNum = colorBloqueado ? 2 : 3;
  const tallasDisponibles = TALLAS.filter(t => !tallasBloqueadas.includes(t));

  return (
    <>
      {colorBloqueado ? (
        <div className="gv-locked-color">
          <span className="gv-color-dot" style={{ background: colorBloqueado.codigo_hex || "#ccc" }} />
          Agregando talla para <strong>{colorBloqueado.nombre}</strong>
        </div>
      ) : (
        <div className="gv-step">
          <p className="gv-step-label"><span className="gv-step-num">1</span> Selecciona los colores</p>
          <div className="gv-color-chips">
            {colores.map(c => {
              const activo = coloresSel.some(x => x.id_color === c.id_color);
              return (
                <button key={c.id_color} className={`gv-color-chip${activo ? " active" : ""}`} onClick={() => toggleColor(c)}>
                  <span className="gv-chip-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                  {c.nombre}
                  {activo && <span className="gv-chip-check"><IconCheck /></span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="gv-step">
        <p className="gv-step-label"><span className="gv-step-num">{tallaStepNum}</span> Selecciona las tallas</p>
        <div className="gv-talla-chips">
          {tallasDisponibles.map(t => (
            <button key={t} className={`gv-talla-chip${tallasSel.includes(t) ? " active" : ""}`} onClick={() => toggleTalla(t)}>
              {t}
            </button>
          ))}
        </div>
        {tallasDisponibles.length === 0 && (
          <p className="gv-empty">Este color ya tiene todas las tallas agregadas.</p>
        )}
      </div>

      {coloresSel.length > 0 && tallasSel.length > 0 && (
        <div className="gv-step">
          <p className="gv-step-label"><span className="gv-step-num">{resumenStepNum}</span> Combinaciones a agregar</p>
          <div className="gv-combo-preview">
            {coloresSel.map(c => (
              <div key={c.id_color} className="gv-combo-preview-row">
                <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                <span className="gv-combo-preview-color">{c.nombre}</span>
                <span className="gv-combo-preview-tallas">{tallasSel.join(" · ")}</span>
              </div>
            ))}
          </div>
          <div className="gv-aviso-stock">
            <IconInfo />
            El stock de estas combinaciones inicia siempre en 0 — se define registrando una compra en el módulo Compras.
          </div>
          <button className="gv-btn-guardar" onClick={onGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : <><IconCheck /> {labelGuardar}</>}
          </button>
        </div>
      )}
    </>
  );
}
