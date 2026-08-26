import { colorInfo } from "../../utils/galeriaImagenesHelpers";
import { IconStar, IconTrash, IconPalette } from "./icons";

// ── Tarjeta de una imagen (server o local) ─────────────────────────────────
export default function ImagenCard({
  entry, soloLectura, todosColores, tieneColores,
  eliminarLocal, setPrincipal, eliminar, cambiarColor,
  editandoColor, setEditandoColor, dropdownPos, setDropdownPos, paletteBtnRefs,
}) {
  if (entry.tipo === "local") {
    const { img, idx } = entry;
    return (
      <div key={`local-${idx}`} className="gi-card local">
        <div className="gi-img-wrap">
          <img src={img.preview} alt={`imagen local ${idx}`} className="gi-img" />
          {!soloLectura && (
            <div className="gi-overlay">
              <button className="gi-btn gi-btn-trash" onClick={() => eliminarLocal(idx)} title="Eliminar">
                <IconTrash />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const img = entry.img;
  const color = colorInfo(img.id_color, todosColores);
  return (
    <div key={img.id_imagen} className={`gi-card${img.es_principal ? " principal" : ""}`}>
      <div className="gi-img-wrap">
        <img src={img.url} alt={img.titulo || "imagen"} className="gi-img" />

        {img.es_principal && (
          <span className="gi-badge-principal">
            <IconStar /> Principal
          </span>
        )}

        {!soloLectura && (
          <div className="gi-overlay">
            {!img.es_principal && (
              <button
                className="gi-btn gi-btn-star"
                onClick={() => setPrincipal(img.id_imagen)}
                title="Marcar como principal"
              >
                <IconStar />
              </button>
            )}

            {tieneColores && (
              <div className="gi-color-picker-wrap">
                <button
                  className="gi-btn gi-btn-palette"
                  ref={(el) => (paletteBtnRefs.current[img.id_imagen] = el)}
                  onClick={(e) => {
                    e.stopPropagation();
                    const btn = paletteBtnRefs.current[img.id_imagen];
                    if (btn) {
                      const rect = btn.getBoundingClientRect();
                      const dropdownWidth = 130;
                      const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);
                      setDropdownPos({ top: rect.bottom + 8, left: Math.max(8, left) });
                    }
                    setEditandoColor(editandoColor === img.id_imagen ? null : img.id_imagen);
                  }}
                  title="Cambiar color"
                >
                  {color
                    ? <span className="gi-btn-color-dot" style={{ background: color.codigo_hex }} />
                    : <IconPalette />}
                </button>
                {editandoColor === img.id_imagen && (
                  <div
                    className="gi-color-picker-dropdown"
                    onMouseEnter={() => setEditandoColor(img.id_imagen)}
                    onMouseLeave={() => setEditandoColor(null)}
                    style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
                  >
                    {todosColores.map(c => (
                      <button
                        key={c.id_color}
                        className={`gi-cp-opt${String(img.id_color) === String(c.id_color) ? " active" : ""}`}
                        onClick={() => cambiarColor(img.id_imagen, c.id_color)}
                      >
                        <span className="gi-cp-dot" style={{ background: c.codigo_hex }} />
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              className="gi-btn gi-btn-trash"
              onClick={() => eliminar(img.id_imagen)}
              title="Eliminar"
            >
              <IconTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
