import { colorInfo } from "../../utils/galeriaImagenesHelpers";
import { IconUpload, IconPencil, IconTrash, IconPlusCircle, IconImage } from "./icons";

// ── Galería del formulario de "Nuevo producto" ────────────────────────────
// Diseño propio (tarjetas con nombre de archivo + color al pie, insignia
// "Portada" en la primera foto, tarjeta "+ Añadir otra vista") — distinto del
// que usa la edición de un producto ya existente, que sigue con ZonaSubida +
// GruposImagenes sin cambios. Aquí no hace falta elegir el color antes de
// subir: cada tarjeta trae su propio selector (lápiz) para asignarlo después,
// así que la subida nunca se bloquea.
export default function GaleriaNuevoProducto({
  imagenesLocales, todosColores, tieneColores,
  eliminarLocal, cambiarColorLocal,
  editandoColor, setEditandoColor, dropdownPos, setDropdownPos, paletteBtnRefs,
  detectandoColor,
  inputRef, onInputChange, onDrop,
}) {
  return (
    <div className="gi-nuevo">
      <div
        className="gi-dropzone-nuevo"
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={onInputChange}
        />
        <span className="gi-dropzone-nuevo-icono"><IconUpload /></span>
        <span className="gi-dropzone-nuevo-texto">
          Arrastra aquí tus archivos multimedia o <u>haz clic para examinar</u>
        </span>
        <span className="gi-dropzone-nuevo-sub">Soporta formatos JPG, PNG o WebP de alta fidelidad (máx. 5MB por archivo).</span>
      </div>

      {detectandoColor && (
        <div className="gi-detectando-color"><div className="gi-spinner" /> Detectando el color de la prenda...</div>
      )}

      {imagenesLocales.length === 0 && (
        <div className="gi-empty">
          <IconImage />
          <span>Sube al menos una foto por color para poder publicar el producto.</span>
        </div>
      )}

      {imagenesLocales.length > 0 && (
        <>
          <p className="gi-vinculadas-titulo">Imágenes vinculadas a variantes</p>
          <div className="gi-grid-nuevo">
            {imagenesLocales.map((img, idx) => {
              const color = colorInfo(img.id_color, todosColores);
              const claveDropdown = `nuevo-${idx}`;
              return (
                <div key={idx} className="gi-card-nuevo">
                  {idx === 0 && <span className="gi-badge-portada">Portada</span>}
                  <div className="gi-img-wrap-nuevo">
                    <img src={img.preview} alt={img.file.name} />
                    <div className="gi-overlay-nuevo">
                      {tieneColores && (
                        <div className="gi-color-picker-wrap">
                          <button
                            type="button"
                            className="gi-btn-nuevo"
                            ref={(el) => (paletteBtnRefs.current[claveDropdown] = el)}
                            onClick={(e) => {
                              e.stopPropagation();
                              const btn = paletteBtnRefs.current[claveDropdown];
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                const dropdownWidth = 130;
                                const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);
                                setDropdownPos({ top: rect.bottom + 8, left: Math.max(8, left) });
                              }
                              setEditandoColor(editandoColor === claveDropdown ? null : claveDropdown);
                            }}
                            title="Cambiar color"
                          >
                            <IconPencil />
                          </button>
                          {editandoColor === claveDropdown && (
                            <div
                              className="gi-color-picker-dropdown"
                              onMouseEnter={() => setEditandoColor(claveDropdown)}
                              onMouseLeave={() => setEditandoColor(null)}
                              style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
                            >
                              {todosColores.map(c => (
                                <button
                                  key={c.id_color}
                                  className={`gi-cp-opt${String(img.id_color) === String(c.id_color) ? " active" : ""}`}
                                  onClick={() => cambiarColorLocal(idx, c.id_color)}
                                >
                                  <span className="gi-cp-dot" style={{ background: c.codigo_hex }} />
                                  {c.nombre}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button type="button" className="gi-btn-nuevo" onClick={(e) => { e.stopPropagation(); eliminarLocal(idx); }} title="Eliminar">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  <div className="gi-card-nombre" title={img.file.name}>{img.file.name}</div>
                  <div className="gi-card-color-bar">
                    <span className="gi-chip-dot" style={{ background: color?.codigo_hex || "#ccc" }} />
                    {color ? color.nombre : "Sin color"}
                  </div>
                </div>
              );
            })}

            <button type="button" className="gi-card-add" onClick={() => inputRef.current?.click()}>
              <IconPlusCircle />
              Añadir otra vista
            </button>
          </div>
        </>
      )}
    </div>
  );
}
