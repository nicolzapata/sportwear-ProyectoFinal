// src/components/GaleriaImagenes.jsx
import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useConfirm } from "../context/ConfirmContext";
import "./GaleriaImagenes.css";

// ── Iconos inline ──────────────────────────────────────────────────────────
const IconStar    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconTrash   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconUpload  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
const IconImage   = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconPalette = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;

export default function GaleriaImagenes({
  tipoReferencia,
  idReferencia,
  soloLectura = false,
  onPendingChange,
  coloresPendientes = [],
  coloresAPurgar = [],
  onColoresPurgados,
}) {
  const [imagenes,         setImagenes]         = useState([]);
  const [coloresVariantes, setColoresVariantes] = useState([]);
  const [cargando,         setCargando]         = useState(true);
  const [subiendo,         setSubiendo]         = useState(false);
  const [error,            setError]            = useState("");
  const [errorSubida,      setErrorSubida]      = useState("");
  const [colorSubida,      setColorSubida]      = useState("");
  const [editandoColor,    setEditandoColor]    = useState(null);
  const [dropdownPos,      setDropdownPos]      = useState({ top: 0, left: 0 });
  const [imagenesLocales,  setImagenesLocales]  = useState([]);
  const [dropzoneAbierto,  setDropzoneAbierto]  = useState(false);

  const inputRef       = useRef();
  const paletteBtnRefs = useRef({});
  const confirmar      = useConfirm();

  const cargar = async () => {
    if (!idReferencia) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const [imgs, vars] = await Promise.all([
        api.get(`/imagenes?tipo=${tipoReferencia}&id=${idReferencia}`),
        tipoReferencia === "Producto"
          ? api.get(`/variantes?id_producto=${idReferencia}`)
          : Promise.resolve({ data: [] }),
      ]);

      setImagenes(imgs.data);

      const coloresUnicos = [
        ...new Map(
          vars.data
            .filter(v => v.id_color && v.color_nombre)
            .map(v => [
              v.id_color,
              { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex },
            ])
        ).values(),
      ];
      setColoresVariantes(coloresUnicos);
    } catch {
      setError("No se pudieron cargar las imágenes.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [idReferencia]);

  // ── Purga externa: se pidió eliminar todas las fotos de ciertos colores
  // (p. ej. al eliminar la última talla de un color desde GestVariantes y el
  // usuario elige "eliminar también las fotos"). Borra las imágenes de esos
  // colores — vía API si están conectadas, filtro local si son pendientes. ──
  useEffect(() => {
    if (!coloresAPurgar || coloresAPurgar.length === 0) return;
    const idsAPurgar = coloresAPurgar.map(String);
    const purgar = async () => {
      if (idReferencia) {
        const aEliminar = imagenes.filter(i => idsAPurgar.includes(String(i.id_color)));
        await Promise.all(aEliminar.map(img => api.delete(`/imagenes/${img.id_imagen}`).catch(() => {})));
        await cargar();
      } else {
        const updated = imagenesLocales.filter(i => !idsAPurgar.includes(String(i.id_color)));
        setImagenesLocales(updated);
        onPendingChange?.(updated);
      }
      onColoresPurgados?.();
    };
    purgar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloresAPurgar]);

  // ── Helpers de color ───────────────────────────────────────────────────────
  // Fuente de colores según el modo (conectado vs local)
  const todosColores = coloresVariantes.length > 0
    ? coloresVariantes
    : coloresPendientes;

  const tieneColores = todosColores.length > 0;

  const colorInfo = (id_color) => {
    if (!id_color) return null;
    return todosColores.find(c => String(c.id_color) === String(id_color)) || null;
  };

  const contarFotos = (id_color) => {
    const idStr = String(id_color);
    const enServidor = imagenes.filter(i => String(i.id_color) === idStr).length;
    const enLocal = imagenesLocales.filter(i => String(i.id_color) === idStr).length;
    return enServidor + enLocal;
  };

  const totalImagenes = imagenes.length + imagenesLocales.length;
  const necesitaColor = tieneColores && !colorSubida;
  const mostrarDropzoneCompleto = totalImagenes === 0 || dropzoneAbierto;

  // ── Acciones sobre imágenes existentes (modo conectado) ───────────────────
  const setPrincipal = async (id) => {
    try { await api.patch(`/imagenes/${id}/principal`); cargar(); }
    catch { setError("No se pudo marcar como principal."); }
  };

  const eliminar = async (id) => {
    const ok = await confirmar({ title: "Eliminar imagen", message: "¿Eliminar esta imagen?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try { await api.delete(`/imagenes/${id}`); cargar(); }
    catch { setError("No se pudo eliminar."); }
  };

  const cambiarColor = async (id, id_color) => {
    try {
      const payload = id_color != null ? { id_color: Number(id_color) } : { id_color: null };
      await api.patch(`/imagenes/${id}/color`, payload);
      setEditandoColor(null);
      cargar();
    } catch {
      setError("No se pudo actualizar el color.");
    }
  };

  // ── Subida de imágenes (común a ambos modos) ───────────────────────────────
  const procesarArchivos = (files) => {
    const nuevas = Array.from(files).map(file => ({
      file,
      id_color: colorSubida || null,
      preview: URL.createObjectURL(file),
    }));
    setImagenesLocales(prev => {
      const updated = [...prev, ...nuevas];
      onPendingChange?.(updated);
      return updated;
    });
    setColorSubida("");
    setErrorSubida("");
    setDropzoneAbierto(false);
  };

  const seleccionarColorSubida = (id_color) => {
    setColorSubida(id_color);
    setErrorSubida("");
  };

  const onInputChange = (e) => {
    if (!e.target.files.length) return;
    procesarArchivos(e.target.files);
    e.target.value = "";
  };

  const onDropzoneClick = () => {
    if (subiendo) return;
    if (necesitaColor) { setErrorSubida("Selecciona un color antes de subir fotos."); return; }
    inputRef.current?.click();
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (necesitaColor) { setErrorSubida("Selecciona un color antes de subir fotos."); return; }
    if (!e.dataTransfer.files.length) return;
    procesarArchivos(e.dataTransfer.files);
  };

  const onDropCollapsado = (e) => {
    e.preventDefault();
    if (necesitaColor) {
      setErrorSubida("Selecciona un color antes de subir fotos.");
      setDropzoneAbierto(true);
      return;
    }
    if (!e.dataTransfer.files.length) { setDropzoneAbierto(true); return; }
    procesarArchivos(e.dataTransfer.files);
  };

  const eliminarLocal = (index) => {
    setImagenesLocales(prev => {
      const updated = prev.filter((_, i) => i !== index);
      onPendingChange?.(updated);
      return updated;
    });
  };

  // ── Zona de subida (reutilizable) ─────────────────────────────────────────
  const ZonaSubida = (
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
          {tieneColores && (
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

  // ── Tarjeta de una imagen (server o local) ─────────────────────────────────
  const renderTarjeta = (entry) => {
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
    const color = colorInfo(img.id_color);
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
                        setDropdownPos({ top: rect.bottom + 8, left: rect.left });
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
  };

  // ── Agrupación de todas las imágenes (server + locales) por color ─────────
  const construirGrupos = () => {
    const mapa = new Map();
    const clave = (id_color) => (id_color ? String(id_color) : "sin-color");
    const asegurar = (id_color) => {
      const k = clave(id_color);
      if (!mapa.has(k)) {
        mapa.set(k, { key: k, info: id_color ? colorInfo(id_color) : null, items: [] });
      }
      return mapa.get(k);
    };
    imagenes.forEach(img => asegurar(img.id_color).items.push({ tipo: "servidor", img }));
    imagenesLocales.forEach((img, idx) => asegurar(img.id_color).items.push({ tipo: "local", img, idx }));

    const ordenColores = todosColores.map(c => String(c.id_color));
    return [...mapa.values()].sort((a, b) => {
      if (a.key === "sin-color") return 1;
      if (b.key === "sin-color") return -1;
      return ordenColores.indexOf(a.key) - ordenColores.indexOf(b.key);
    });
  };

  const GruposImagenes = totalImagenes > 0 && (
    <div className="gi-grupos">
      {construirGrupos().map(g => (
        <div key={g.key} className="gi-grupo">
          <div className="gi-grupo-header">
            <span className={`gi-chip-dot${g.info ? "" : " gi-chip-dot-none"}`} style={g.info ? { background: g.info.codigo_hex } : undefined} />
            {g.info ? g.info.nombre : "Sin color asignar"}
            <span className="gi-grupo-count">({g.items.length})</span>
          </div>
          <div className="gi-grid">
            {g.items.map(renderTarjeta)}
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // MODO SIN PRODUCTO GUARDADO (idReferencia null/undefined)
  // Permite subir imágenes y previsualizarlas antes de guardar
  // ════════════════════════════════════════════════════════════════
  if (!idReferencia) {
    return (
      <div className="gi-container">
        {!soloLectura && ZonaSubida}
        {GruposImagenes}
        {totalImagenes === 0 && (
          <div className="gi-empty">
            <IconImage />
            <span>Sube al menos una foto por color para poder publicar el producto.</span>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MODO CON PRODUCTO GUARDADO
  // ════════════════════════════════════════════════════════════════
  if (cargando) return (
    <div className="gi-loading"><div className="gi-spinner" /> Cargando imágenes...</div>
  );

  return (
    <div className="gi-container">
      {error && <p className="gi-error">{error}</p>}

      {!soloLectura && ZonaSubida}

      {GruposImagenes}

      {totalImagenes === 0 && (
        <div className="gi-empty">
          <IconImage />
          <span>Sin imágenes todavía.</span>
        </div>
      )}
    </div>
  );
}
