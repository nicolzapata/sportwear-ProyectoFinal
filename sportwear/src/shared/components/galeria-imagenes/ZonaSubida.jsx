import { IconUpload, IconPalette } from "./icons";

// ── Zona de subida (reutilizable) ─────────────────────────────────────────
export default function ZonaSubida({
  mostrarDropzoneCompleto, setDropzoneAbierto, onDropCollapsado,
  tieneColores, todosColores, colorSubida, seleccionarColorSubida, contarFotos,
  errorSubida, necesitaColor, subiendo,
  inputRef, onInputChange, onDrop, onDropzoneClick,
}) {
  return (
    <div className="gi-upload-area">
      {!mostrarDropzoneCompleto ? (
        <div
          className="gi-dropzone-collapsed"
          onClick={() => setDropzoneAbierto(true)}
          onDragOver={e => e.preventDefault()}
          onDrop={onDropCollapsado}
        >
          <IconUpload /> Agregar más fotos
        </div>
      ) : (
        <>
          {tieneColores && todosColores.length > 1 && (
            <div className="gi-upload-color-row">
              <span className="gi-upload-color-label">
                <IconPalette /> Color de las fotos a subir
              </span>
              <div className="gi-color-chips-upload">
                {todosColores.map(c => {
                  const activo = String(colorSubida) === String(c.id_color);
                  const count = contarFotos(c.id_color);
                  return (
                    <button
                      key={c.id_color}
                      type="button"
                      className={`gi-chip-upload${activo ? " active" : ""}`}
                      onClick={() => seleccionarColorSubida(String(c.id_color))}
                    >
                      <span className="gi-chip-dot" style={{ background: c.codigo_hex }} />
                      {c.nombre}
                      <span className="gi-chip-count">· {count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorSubida && <p className="gi-error gi-error-inline">{errorSubida}</p>}

          <div
            className={`gi-dropzone${subiendo ? " uploading" : ""}${necesitaColor ? " disabled" : ""}`}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={onDropzoneClick}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: "none" }}
              onChange={onInputChange}
            />
            {subiendo ? (
              <div className="gi-upload-uploading">
                <div className="gi-spinner" />
                <span>Subiendo imágenes...</span>
              </div>
            ) : necesitaColor ? (
              <div className="gi-upload-hint gi-upload-hint-disabled">
                <IconUpload />
                <span>Selecciona un color arriba para habilitar la subida</span>
              </div>
            ) : (
              <div className="gi-upload-hint">
                <IconUpload />
                <span>Arrastra imágenes aquí o <u>haz clic para seleccionar</u></span>
                <span className="gi-upload-sub">JPG, PNG, WEBP o GIF · máx 5 MB c/u</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
