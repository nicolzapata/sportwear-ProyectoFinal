// src/components/GestVariantes.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useConfirm } from "../../../shared/contexts/ConfirmContext";
import "./GestVariantes.css";

const TALLAS = ["XS","S","M","L","XL","XXL","Única","28","30","32","34","36","38","40","42","44"];

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconInfo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>
  </svg>
);
// Agrupa una lista de variantes por color — mismo criterio que el chip de
// Tallas/Colores de la tabla y el modal de detalle de GestProductos: un
// chip por color con sus tallas adentro, no un chip por combinación.
const agruparPorColor = (lista) => {
  const grupos = new Map();
  lista.forEach(v => {
    if (!grupos.has(v.id_color)) grupos.set(v.id_color, { id_color: v.id_color, color_nombre: v.color_nombre, codigo_hex: v.codigo_hex, items: [] });
    grupos.get(v.id_color).items.push({ talla: v.talla, stock: v.stock, id_variante: v.id_variante });
  });
  return [...grupos.values()];
};

// ── Lista de chips por color (mismo lenguaje visual que "ver detalle") ──────
// Cada talla es su propio tag de solo lectura (el stock nunca se edita aquí,
// solo se ve): "×" para eliminarla; al final del chip un "+" para agregar
// otra talla a ese color.
function ChipsColorList({ grupos, onEliminar, onAgregarTalla }) {
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

/**
 * GestVariantes
 *
 * Modos de operación:
 * 1. idProducto definido  → modo conectado: lee/escribe variantes en la API.
 * 2. idProducto null/undefined → modo local: acumula variantes pendientes y
 *    las emite por `onPendingChange(pendingList)` cada vez que cambian.
 */
export default function GestVariantes({
  idProducto, estadoProducto, onPendingChange, coloresAPurgar = [], onColoresPurgados,
  imagenesPendientes = [], onEliminarFotosDeColor, onVariantesChange,
}) {
  const confirmar = useConfirm();

  // ── Estado modo conectado ──────────────────────────────────────────────────
  const [variantes,   setVariantes]   = useState([]);
  const [colores,     setColores]     = useState([]);
  const [loading,     setLoading]     = useState(!!idProducto);
  const [error,       setError]       = useState("");
  const [guardando,   setGuardando]   = useState(false);
  const [modoAgregar, setModoAgregar] = useState(false);

  // ── Estado modo local ──────────────────────────────────────────────────────
  const [pendingVariantes, setPendingVariantes] = useState([]);

  // ── Selector del editor "agregar nuevas" (compartido ambos modos) ──────────
  // El stock nunca se define aquí (ni al crear ni al editar): siempre nace en 0
  // y solo aumenta registrando una compra en el módulo Compras. Por eso no hay
  // estado tipo "matriz" de stock — solo se eligen color(es) y talla(s).
  const [coloresSel, setColoresSel] = useState([]);
  const [tallasSel,  setTallasSel]  = useState([]);
  // Cuando se agrega talla a un color ya existente (atajo "+"), el color queda
  // fijo y no se pueden volver a ofrecer las tallas que ese color ya tiene.
  const [colorBloqueado,    setColorBloqueado]    = useState(null);
  const [tallasBloqueadas,  setTallasBloqueadas]  = useState([]);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = async () => {
    try {
      const [vars, cols] = await Promise.all([
        api.get(`/variantes?id_producto=${idProducto}`),
        api.get('/colores'),
      ]);
      setVariantes(vars.data);
      setColores(cols.data.filter(c => c.estado === 'Activo'));
      // Avisa al padre que la lista de variantes cambió (se agregó/quitó un
      // color, o se cargó por primera vez) — así GaleriaImagenes sabe que debe
      // refrescar su propia lista de colores disponibles para subir fotos.
      onVariantesChange?.();
    } catch {
      setError("No se pudieron cargar las variantes.");
    } finally {
      setLoading(false);
    }
  };

  const cargarColores = async () => {
    try {
      const { data } = await api.get('/colores');
      setColores(data.filter(c => c.estado === 'Activo'));
    } catch {
      setError("No se pudieron cargar los colores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idProducto) { setLoading(true); cargar(); }
    else            { setLoading(true); cargarColores(); }
  }, [idProducto]);

  // ── Purga externa: GestProductos pide eliminar colores sin fotos antes de
  // guardar. Borra todas las variantes de esos colores (API si están conectadas,
  // filtro local si son pendientes) y avisa cuando termina para que el padre
  // reintente el guardado. ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!coloresAPurgar || coloresAPurgar.length === 0) return;
    const idsAPurgar = coloresAPurgar.map(String);
    const purgar = async () => {
      if (idProducto) {
        const aEliminar = variantes.filter(v => idsAPurgar.includes(String(v.id_color)));
        await Promise.all(aEliminar.map(v => api.delete(`/variantes/${v.id_variante}`).catch(() => {})));
        await cargar();
      } else {
        const updated = pendingVariantes.filter(v => !idsAPurgar.includes(String(v.id_color)));
        setPendingVariantes(updated);
        onPendingChange?.(updated);
      }
      onColoresPurgados?.();
    };
    purgar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloresAPurgar]);

  // ── Helpers selector "agregar" ─────────────────────────────────────────────
  const toggleColor = (color) => {
    const existe = coloresSel.some(c => c.id_color === color.id_color);
    if (existe) {
      setColoresSel(prev => prev.filter(c => c.id_color !== color.id_color));
    } else {
      setColoresSel(prev => [...prev, color]);
    }
  };

  const toggleTalla = (talla) => {
    const existe = tallasSel.includes(talla);
    if (existe) setTallasSel(prev => prev.filter(t => t !== talla));
    else        setTallasSel(prev => [...prev, talla]);
  };

  // ── Guardar nuevas variantes (modo conectado) ──────────────────────────────
  const guardarMatrizConectado = async () => {
    if (!coloresSel.length || !tallasSel.length) {
      setError("Selecciona al menos un color y una talla.");
      return;
    }
    setGuardando(true);
    setError("");
    const promesas = [];
    coloresSel.forEach(c => {
      tallasSel.forEach(t => {
        promesas.push(
          api.post('/variantes', {
            id_producto: idProducto,
            id_color: c.id_color,
            talla: t,
            stock: 0, // el stock siempre nace en 0 — se define al registrar una compra
          }).catch(() => ({ skipped: true }))
        );
      });
    });
    const resultados = await Promise.all(promesas);
    const omitidas = resultados.filter(r => r?.skipped).length;
    if (omitidas) setError(`${omitidas} combinación(es) ya existían y fueron omitidas.`);
    
    const { data: todasVariantes } = await api.get(`/variantes?id_producto=${idProducto}`);
    const stockTotal = todasVariantes.reduce((acc, v) => acc + (v.stock || 0), 0);
    if (stockTotal === 0 && estadoProducto === 'Activo') {
      await api.patch(`/productos/${idProducto}/estado`);
    }

    setColoresSel([]); setTallasSel([]);
    setModoAgregar(false);
    setGuardando(false);
    cargar();
  };

  // ── Guardar nuevas variantes (modo local) ──────────────────────────────────
  const guardarMatrizLocal = () => {
    if (!coloresSel.length || !tallasSel.length) {
      setError("Selecciona al menos un color y una talla.");
      return;
    }
    setError("");
    const nuevas = [];
    coloresSel.forEach(c => {
      tallasSel.forEach(t => {
        const yaExiste = pendingVariantes.some(v => v.id_color === c.id_color && v.talla === t);
        if (!yaExiste) {
          nuevas.push({
            id_color: c.id_color, color_nombre: c.nombre,
            codigo_hex: c.codigo_hex, talla: t,
            stock: 0, // el stock siempre nace en 0 — se define al registrar una compra
          });
        }
      });
    });
    const omitidas = coloresSel.length * tallasSel.length - nuevas.length;
    if (omitidas) setError(`${omitidas} combinación(es) ya estaban agregadas.`);
    const updated = [...pendingVariantes, ...nuevas];
    setPendingVariantes(updated);
    onPendingChange?.(updated);
    setColoresSel([]); setTallasSel([]);
    setModoAgregar(false);
  };

  // Pregunta qué hacer con las fotos de un color cuando la variante que se
  // elimina era la última talla de ese color y ese color tiene fotos —
  // el usuario elige entre eliminarlas también o conservarlas.
  const preguntarPorFotosDelColor = async (id_color, fotos) => {
    if (!id_color || fotos.length === 0) return;
    const n = fotos.length;
    const eliminarFotos = await confirmar({
      title: "Fotos de este color",
      message: `Ya no quedan tallas de este color en el producto. Tiene ${n} foto${n > 1 ? "s" : ""} asociada${n > 1 ? "s" : ""}. ¿Deseas eliminarla${n > 1 ? "s" : ""} también o conservarla${n > 1 ? "s" : ""}?`,
      confirmLabel: `Eliminar también la${n > 1 ? "s" : ""} foto${n > 1 ? "s" : ""}`,
      cancelLabel: `Conservar la${n > 1 ? "s" : ""} foto${n > 1 ? "s" : ""}`,
    });
    if (eliminarFotos) onEliminarFotosDeColor?.(id_color);
  };

  const eliminarPendiente = async (id_color, talla) => {
    const updated = pendingVariantes.filter(v => !(v.id_color === id_color && v.talla === talla));
    const quedanOtras = updated.some(v => v.id_color === id_color);
    if (!quedanOtras) {
      const fotos = imagenesPendientes.filter(i => String(i.id_color) === String(id_color));
      await preguntarPorFotosDelColor(id_color, fotos);
    }
    setPendingVariantes(updated);
    onPendingChange?.(updated);
  };

  // Atajo: agregar más tallas a un color que ya tiene variantes, sin tener
  // que volver a buscarlo y marcarlo desde cero en el selector de colores.
  // El color queda fijo y no se ofrecen las tallas que ese color ya tiene.
  const agregarTallaAColor = (c, tallasUsadas = []) => {
    const colorObj = { id_color: c.id_color, nombre: c.color_nombre, codigo_hex: c.codigo_hex };
    setColoresSel([colorObj]);
    setColorBloqueado(colorObj);
    setTallasBloqueadas(tallasUsadas);
    setTallasSel([]);
    setModoAgregar(true);
    setError("");
  };

  const eliminarVariante = async (id_variante, id_color) => {
    const ok = await confirmar({ title: "Eliminar variante", message: "¿Eliminar esta variante?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try {
      await api.delete(`/variantes/${id_variante}`);
      const quedanOtras = variantes.some(v => v.id_variante !== id_variante && v.id_color === id_color);
      if (!quedanOtras) {
        try {
          const { data } = await api.get(`/imagenes?tipo=Producto&id=${idProducto}`);
          const fotos = data.filter(i => String(i.id_color) === String(id_color));
          await preguntarPorFotosDelColor(id_color, fotos);
        } catch { /* si falla la verificación, se conservan las fotos sin preguntar */ }
      }
      cargar();
    } catch { setError("No se pudo eliminar."); }
  };

  // ── Construir vistas: mismo agrupamiento por color, separado en con-stock /
  // sin-stock, que usa el modal de detalle de GestProductos. ──────────────────
  const stockTotal = variantes.reduce((acc, v) => acc + (v.stock || 0), 0);
  const gruposConStock = agruparPorColor(variantes.filter(v => v.stock > 0));
  const gruposSinStock = agruparPorColor(variantes.filter(v => v.stock === 0));

  const gruposConStockPend = agruparPorColor(pendingVariantes.filter(v => v.stock > 0));
  const gruposSinStockPend = agruparPorColor(pendingVariantes.filter(v => v.stock === 0));

  if (loading) return (
    <div className="gv-loading"><div className="gv-spinner" /> Cargando variantes...</div>
  );

  // ════════════════════════════════════════════════════════════════
  // RENDER MODO LOCAL
  // ════════════════════════════════════════════════════════════════
  if (!idProducto) {
    return (
      <div className="gv-container">
        <div className="gv-header">
          <span className="gv-title">Tallas y colores</span>
          {pendingVariantes.length > 0 && (
            <span className="gv-stock-total">
              <strong>{pendingVariantes.length}</strong> combinación(es) lista(s)
            </span>
          )}
        </div>

        {error && <p className="gv-error">{error}</p>}

        {gruposConStockPend.length > 0 && (
          <ChipsColorList
            grupos={gruposConStockPend}
            onEliminar={(g, talla) => eliminarPendiente(g.id_color, talla)}
            onAgregarTalla={(g) => agregarTallaAColor(g, pendingVariantes.filter(v => v.id_color === g.id_color).map(v => v.talla))}
          />
        )}
        {gruposSinStockPend.length > 0 && (
          <>
            <div className="gv-chips-divider"><span>Sin stock</span></div>
            <ChipsColorList
              grupos={gruposSinStockPend}
              onEliminar={(g, talla) => eliminarPendiente(g.id_color, talla)}
              onAgregarTalla={(g) => agregarTallaAColor(g, pendingVariantes.filter(v => v.id_color === g.id_color).map(v => v.talla))}
            />
          </>
        )}

        {pendingVariantes.length === 0 && !modoAgregar && (
          <p className="gv-empty">Agrega colores y tallas abajo.</p>
        )}

        <div className="gv-editor">
          <button className="gv-toggle-editor" onClick={() => {
            setModoAgregar(p => !p); setError("");
            setColorBloqueado(null); setTallasBloqueadas([]); setColoresSel([]); setTallasSel([]);
          }}>
            {modoAgregar ? <><IconX /> Cancelar</> : <><IconPlus /> Agregar</>}
          </button>

          {modoAgregar && (
            <div className="gv-editor-body">
              <EditorNuevas
                colores={colores} coloresSel={coloresSel} toggleColor={toggleColor}
                tallasSel={tallasSel} toggleTalla={toggleTalla}
                onGuardar={guardarMatrizLocal}
                labelGuardar="Agregar a la lista"
                guardando={false}
                colorBloqueado={colorBloqueado}
                tallasBloqueadas={tallasBloqueadas}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER MODO CONECTADO
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="gv-container">

      <div className="gv-header">
        <span className="gv-title">Tallas y colores</span>
        <div className="gv-header-actions">
          {variantes.length > 0 && (
            <span className="gv-stock-total">Stock total: <strong>{stockTotal}</strong> uds</span>
          )}
        </div>
      </div>

      {error && <p className="gv-error">{error}</p>}

      {/* ── Variantes existentes: mismo estilo de chips agrupados por color
          que "ver detalle", con la sección "Sin stock" separada. ── */}
      {gruposConStock.length > 0 && (
        <ChipsColorList
          grupos={gruposConStock}
          onEliminar={(g, talla, id_variante) => eliminarVariante(id_variante, g.id_color)}
          onAgregarTalla={(g) => agregarTallaAColor(g, variantes.filter(v => v.id_color === g.id_color).map(v => v.talla))}
        />
      )}
      {gruposSinStock.length > 0 && (
        <>
          <div className="gv-chips-divider"><span>Sin stock</span></div>
          <ChipsColorList
            grupos={gruposSinStock}
            onEliminar={(g, talla, id_variante) => eliminarVariante(id_variante, g.id_color)}
            onAgregarTalla={(g) => agregarTallaAColor(g, variantes.filter(v => v.id_color === g.id_color).map(v => v.talla))}
          />
        </>
      )}

      {variantes.length === 0 && !modoAgregar && (
        <p className="gv-empty">Agrega colores y tallas abajo.</p>
      )}

      {/* ── Panel agregar nuevas variantes ── */}
      <div className="gv-editor">
        <button className="gv-toggle-editor" onClick={() => {
          setModoAgregar(p => !p); setError("");
          setColorBloqueado(null); setTallasBloqueadas([]); setColoresSel([]); setTallasSel([]);
        }}>
          {modoAgregar ? <><IconX /> Cancelar</> : <><IconPlus /> Agregar</>}
        </button>

        {modoAgregar && (
          <div className="gv-editor-body">
            <EditorNuevas
              colores={colores} coloresSel={coloresSel} toggleColor={toggleColor}
              tallasSel={tallasSel} toggleTalla={toggleTalla}
              onGuardar={guardarMatrizConectado}
              labelGuardar="Guardar variantes"
              guardando={guardando}
              colorBloqueado={colorBloqueado}
              tallasBloqueadas={tallasBloqueadas}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponente reutilizable: editor de nuevas variantes (matriz) ──────────
// El stock NUNCA se pide aquí: toda combinación nueva nace con stock 0 y solo
// aumenta al registrar una compra en el módulo Compras (tanto al crear un
// producto como al agregarle tallas/colores nuevos después).
function EditorNuevas({ colores, coloresSel, toggleColor, tallasSel, toggleTalla, onGuardar, labelGuardar, guardando, colorBloqueado, tallasBloqueadas = [] }) {
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