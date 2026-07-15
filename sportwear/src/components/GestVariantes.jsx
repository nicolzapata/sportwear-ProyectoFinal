// src/components/GestVariantes.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import "./GestVariantes.css";

const TALLAS = ["XS","S","M","L","XL","XXL","Única","28","30","32","34","36","38","40","42","44"];

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconDots = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/>
  </svg>
);

/**
 * GestVariantes
 *
 * Modos de operación:
 * 1. idProducto definido  → modo conectado: lee/escribe variantes en la API.
 * 2. idProducto null/undefined → modo local: acumula variantes pendientes y
 *    las emite por `onPendingChange(pendingList)` cada vez que cambian.
 */
export default function GestVariantes({ idProducto, estadoProducto, onPendingChange }) {

  // ── Estado modo conectado ──────────────────────────────────────────────────
  const [variantes,   setVariantes]   = useState([]);
  const [colores,     setColores]     = useState([]);
  const [loading,     setLoading]     = useState(!!idProducto);
  const [error,       setError]       = useState("");
  const [guardando,   setGuardando]   = useState(false);
  const [modoAgregar, setModoAgregar] = useState(false);

  // ── Edición individual de variante existente ───────────────────────────────
  // editando: { id_variante, id_color, talla, stock } | null
  const [editando, setEditando] = useState(null);

  // ── Estado modo local ──────────────────────────────────────────────────────
  const [pendingVariantes, setPendingVariantes] = useState([]);
  // Menú de opciones (Editar/Eliminar), anclado al encabezado de la talla,
  // y edición inline de una combinación pendiente puntual.
  const [menuTallaAbierta,   setMenuTallaAbierta]   = useState(null); // talla | null
  const [editandoPendiente,  setEditandoPendiente]  = useState(null); // { id_color, talla, stock } | null

  // ── Selector del editor "agregar nuevas" (compartido ambos modos) ──────────
  const [coloresSel, setColoresSel] = useState([]);
  const [tallasSel,  setTallasSel]  = useState([]);
  const [matriz,     setMatriz]     = useState({});
  // Cuando se agrega talla a un color ya existente (atajo "+"), el color queda
  // fijo y no se pueden volver a ofrecer las tallas que ese color ya tiene.
  const [colorBloqueado,    setColorBloqueado]    = useState(null);
  const [tallasBloqueadas,  setTallasBloqueadas]  = useState([]);

  // Cierra el menú de opciones al hacer click fuera de él.
  useEffect(() => {
    if (!menuTallaAbierta) return;
    const cerrar = () => setMenuTallaAbierta(null);
    document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [menuTallaAbierta]);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = async () => {
    try {
      const [vars, cols] = await Promise.all([
        api.get(`/variantes?id_producto=${idProducto}`),
        api.get('/colores'),
      ]);
      setVariantes(vars.data);
      setColores(cols.data.filter(c => c.estado === 'Activo'));
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

  // ── Helpers selector "agregar" ─────────────────────────────────────────────
  const toggleColor = (color) => {
    const existe = coloresSel.some(c => c.id_color === color.id_color);
    if (existe) {
      setColoresSel(prev => prev.filter(c => c.id_color !== color.id_color));
      setMatriz(prev => { const n = { ...prev }; delete n[color.id_color]; return n; });
    } else {
      setColoresSel(prev => [...prev, color]);
      setMatriz(prev => ({
        ...prev,
        [color.id_color]: tallasSel.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}),
      }));
    }
  };

  const toggleTalla = (talla) => {
    const existe = tallasSel.includes(talla);
    if (existe) {
      setTallasSel(prev => prev.filter(t => t !== talla));
      setMatriz(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(id => { const r = { ...n[id] }; delete r[talla]; n[id] = r; });
        return n;
      });
    } else {
      setTallasSel(prev => [...prev, talla]);
      setMatriz(prev => {
        const n = { ...prev };
        coloresSel.forEach(c => { n[c.id_color] = { ...(n[c.id_color] || {}), [talla]: 0 }; });
        return n;
      });
    }
  };

  const setStock = (id_color, talla, valor) =>
    setMatriz(prev => ({
      ...prev,
      [id_color]: { ...(prev[id_color] || {}), [talla]: Math.max(0, Number(valor) || 0) },
    }));

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
            stock: matriz[c.id_color]?.[t] ?? 0,
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

    setColoresSel([]); setTallasSel([]); setMatriz({});
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
            stock: matriz[c.id_color]?.[t] ?? 0,
          });
        }
      });
    });
    const omitidas = coloresSel.length * tallasSel.length - nuevas.length;
    if (omitidas) setError(`${omitidas} combinación(es) ya estaban agregadas.`);
    const updated = [...pendingVariantes, ...nuevas];
    setPendingVariantes(updated);
    onPendingChange?.(updated);
    setColoresSel([]); setTallasSel([]); setMatriz({});
    setModoAgregar(false);
  };

  const eliminarPendiente = (id_color, talla) => {
    const updated = pendingVariantes.filter(v => !(v.id_color === id_color && v.talla === talla));
    setPendingVariantes(updated);
    onPendingChange?.(updated);
  };

  const actualizarStockPendiente = (id_color, talla, nuevoStock) => {
    const updated = pendingVariantes.map(v =>
      v.id_color === id_color && v.talla === talla
        ? { ...v, stock: Math.max(0, Number(nuevoStock) || 0) }
        : v
    );
    setPendingVariantes(updated);
    onPendingChange?.(updated);
  };

  // ── Edición individual (modo conectado) ────────────────────────────────────
  const iniciarEdicion = (v) => {
    setEditando({
      id_variante: v.id_variante,
      id_color:    v.id_color,
      talla:       v.talla,
      stock:       v.stock,
    });
    setModoAgregar(false); // cerrar el panel agregar si está abierto
  };

  const cancelarEdicion = () => setEditando(null);

  // Atajo: agregar más tallas a un color que ya tiene variantes, sin tener
  // que volver a buscarlo y marcarlo desde cero en el selector de colores.
  // El color queda fijo y no se ofrecen las tallas que ese color ya tiene.
  const agregarTallaAColor = (c, tallasUsadas = []) => {
    setEditando(null);
    const colorObj = { id_color: c.id_color, nombre: c.color_nombre, codigo_hex: c.codigo_hex };
    setColoresSel([colorObj]);
    setColorBloqueado(colorObj);
    setTallasBloqueadas(tallasUsadas);
    setTallasSel([]);
    setMatriz({});
    setModoAgregar(true);
    setError("");
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardando(true);
    setError("");
    try {
      await api.put(`/variantes/${editando.id_variante}`, {
        id_color: editando.id_color,
        talla:    editando.talla,
        stock:    Number(editando.stock),
      });
      
      if (Number(editando.stock) === 0 && idProducto) {
        const { data: todasVariantes } = await api.get(`/variantes?id_producto=${idProducto}`);
        const stockTotal = todasVariantes.reduce((acc, v) => acc + (v.stock || 0), 0);
        if (stockTotal === 0 && estadoProducto === 'Activo') {
          await api.patch(`/productos/${idProducto}/estado`);
        }
      }
      
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar. Puede ser una combinación duplicada.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarVariante = async (id_variante) => {
    if (!window.confirm("¿Eliminar esta variante?")) return;
    try { await api.delete(`/variantes/${id_variante}`); cargar(); }
    catch { setError("No se pudo eliminar."); }
  };

  // ── Construir vistas ───────────────────────────────────────────────────────
  const coloresExistentes = [...new Map(
    variantes.map(v => [v.id_color, { id_color: v.id_color, color_nombre: v.color_nombre, codigo_hex: v.codigo_hex }])
  ).values()];
  const tallasExistentes = TALLAS.filter(t => variantes.some(v => v.talla === t));
  const getVar = (id_color, talla) => variantes.find(v => v.id_color === id_color && v.talla === talla);
  const stockTotal = variantes.reduce((acc, v) => acc + (v.stock || 0), 0);

  const coloresPendientes = [...new Map(
    pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, color_nombre: v.color_nombre, codigo_hex: v.codigo_hex }])
  ).values()];
  const tallasPendientes = TALLAS.filter(t => pendingVariantes.some(v => v.talla === t));
  const getPending = (id_color, talla) => pendingVariantes.find(v => v.id_color === id_color && v.talla === talla);

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

        {pendingVariantes.length > 0 && (
          <div className="gv-table-wrap">
            <table className="gv-matrix-table">
              <thead>
                <tr>
                  <th className="gv-th-color">Color</th>
                  {tallasPendientes.map(t => {
                    const menuAbierto = menuTallaAbierta === t;
                    const combos = coloresPendientes
                      .map(c => ({ c, v: getPending(c.id_color, t) }))
                      .filter(({ v }) => v);
                    return (
                      <th key={t} className="gv-th-talla">
                        <span className="gv-th-talla-label">
                          {t}
                          <button className="gv-btn-kebab"
                            onClick={(e) => { e.stopPropagation(); setMenuTallaAbierta(menuAbierto ? null : t); }}
                            title="Opciones">
                            <IconDots />
                          </button>
                        </span>
                        {menuAbierto && (
                          <div className="gv-mini-menu gv-mini-menu-talla" onClick={(e) => e.stopPropagation()}>
                            {combos.map(({ c, v }) => (
                              <div key={c.id_color} className="gv-mini-menu-row">
                                <span className="gv-mini-menu-color">
                                  <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                                  {c.color_nombre} · {v.stock}
                                </span>
                                <span className="gv-mini-menu-actions">
                                  <button onClick={() => { setEditandoPendiente({ id_color: c.id_color, talla: t, stock: v.stock }); setMenuTallaAbierta(null); }} title="Editar">
                                    <IconEdit />
                                  </button>
                                  <button className="danger" onClick={() => eliminarPendiente(c.id_color, t)} title="Eliminar">
                                    <IconTrash />
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="gv-th-acciones" />
                </tr>
              </thead>
              <tbody>
                {coloresPendientes.map(c => (
                  <tr key={c.id_color}>
                    <td className="gv-td-color">
                      <div className="gv-color-cell">
                        <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                        {c.color_nombre}
                      </div>
                    </td>
                    {tallasPendientes.map(t => {
                      const v = getPending(c.id_color, t);
                      const enEdicion = editandoPendiente?.id_color === c.id_color && editandoPendiente?.talla === t;
                      return (
                        <td key={t} className="gv-td-stock">
                          {!v ? <span className="gv-stock-na">—</span> : enEdicion ? (
                            <input
                              type="number" min={0} autoFocus className="gv-stock-input"
                              value={editandoPendiente.stock}
                              onChange={e => setEditandoPendiente(prev => ({ ...prev, stock: e.target.value }))}
                              onBlur={() => { actualizarStockPendiente(c.id_color, t, editandoPendiente.stock); setEditandoPendiente(null); }}
                              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                            />
                          ) : (
                            <span className={`gv-stock-val${v.stock === 0 ? " out" : v.stock < 5 ? " low" : ""}`}>{v.stock}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="gv-td-del">
                      <button className="gv-btn-edit"
                        onClick={() => agregarTallaAColor(c, pendingVariantes.filter(v => v.id_color === c.id_color).map(v => v.talla))}
                        title={`Agregar otra talla en ${c.color_nombre}`}>
                        <IconPlus />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendingVariantes.length === 0 && !modoAgregar && (
          <p className="gv-empty">Agrega colores y tallas abajo.</p>
        )}

        <div className="gv-editor">
          <button className="gv-toggle-editor" onClick={() => {
            setModoAgregar(p => !p); setError("");
            setColorBloqueado(null); setTallasBloqueadas([]); setColoresSel([]); setTallasSel([]); setMatriz({});
          }}>
            {modoAgregar ? <><IconX /> Cancelar</> : <><IconPlus /> Agregar</>}
          </button>

          {modoAgregar && (
            <div className="gv-editor-body">
              <EditorNuevas
                colores={colores} coloresSel={coloresSel} toggleColor={toggleColor}
                tallasSel={tallasSel} toggleTalla={toggleTalla}
                matriz={matriz} setStock={setStock}
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

      {/* ── Tabla de variantes existentes ── */}
      {variantes.length > 0 && (
        <div className="gv-table-wrap">
          <table className="gv-matrix-table">
            <thead>
              <tr>
                <th className="gv-th-color">Color</th>
                {tallasExistentes.map(t => <th key={t} className="gv-th-talla">{t}</th>)}
                <th className="gv-th-acciones" />
                <th className="gv-th-acciones" />
              </tr>
            </thead>
            <tbody>
              {coloresExistentes.map(c => (
                <tr key={c.id_color}>
                  <td className="gv-td-color">
                    <div className="gv-color-cell">
                      <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                      {c.color_nombre}
                    </div>
                  </td>
                  {tallasExistentes.map(t => {
                    const v = getVar(c.id_color, t);
                    return (
                      <td key={t} className="gv-td-stock">
                        {v
                          ? <span className={`gv-stock-val${v.stock === 0 ? " out" : v.stock < 5 ? " low" : ""}`}>{v.stock}</span>
                          : <span className="gv-stock-na">—</span>}
                      </td>
                    );
                  })}
                  <td className="gv-td-del">
                    {tallasExistentes.map(t => {
                      const v = getVar(c.id_color, t);
                      return v ? (
                        <div key={t} className="gv-td-actions">
                          <button className="gv-btn-edit" onClick={() => iniciarEdicion(v)} title="Editar variante">
                            <IconEdit />
                          </button>
                          <button className="gv-btn-del" onClick={() => eliminarVariante(v.id_variante)} title="Eliminar">
                            <IconTrash />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </td>
                  <td className="gv-td-del">
                    <button className="gv-btn-edit"
                      onClick={() => agregarTallaAColor(c, variantes.filter(v => v.id_color === c.id_color).map(v => v.talla))}
                      title={`Agregar otra talla en ${c.color_nombre}`}>
                      <IconPlus />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {variantes.length === 0 && !modoAgregar && (
        <p className="gv-empty">Agrega colores y tallas abajo.</p>
      )}

      {/* ── Panel de edición individual ── */}
      {editando && (
        <div className="gv-edit-panel">
          <div className="gv-edit-panel-header">
            <span className="gv-edit-panel-title">Editar variante</span>
            <button className="gv-btn-sm gv-btn-sm-cancel" onClick={cancelarEdicion}>
              <IconX /> Cancelar
            </button>
          </div>

          <div className="gv-edit-panel-body">

            {/* Color */}
            <div className="gv-step">
              <p className="gv-step-label">
                <span className="gv-step-num">1</span> Color
              </p>
              <div className="gv-color-chips">
                {colores.map(c => {
                  const activo = editando.id_color === c.id_color;
                  return (
                    <button
                      key={c.id_color}
                      className={`gv-color-chip${activo ? " active" : ""}`}
                      onClick={() => setEditando(prev => ({ ...prev, id_color: c.id_color }))}
                    >
                      <span className="gv-chip-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                      {c.nombre}
                      {activo && <span className="gv-chip-check"><IconCheck /></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Talla */}
            <div className="gv-step">
              <p className="gv-step-label">
                <span className="gv-step-num">2</span> Talla
              </p>
              <div className="gv-talla-chips">
                {TALLAS.map(t => (
                  <button
                    key={t}
                    className={`gv-talla-chip${editando.talla === t ? " active" : ""}`}
                    onClick={() => setEditando(prev => ({ ...prev, talla: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div className="gv-step">
              <p className="gv-step-label">
                <span className="gv-step-num">3</span> Stock
              </p>
              <input
                type="number"
                min={0}
                className="gv-stock-input-single"
                value={editando.stock}
                onChange={e => setEditando(prev => ({ ...prev, stock: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>

            <button
              className="gv-btn-guardar"
              onClick={guardarEdicion}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : <><IconCheck /> Guardar cambios</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Panel agregar nuevas variantes ── */}
      {!editando && (
        <div className="gv-editor">
          <button className="gv-toggle-editor" onClick={() => {
            setModoAgregar(p => !p); setError("");
            setColorBloqueado(null); setTallasBloqueadas([]); setColoresSel([]); setTallasSel([]); setMatriz({});
          }}>
            {modoAgregar ? <><IconX /> Cancelar</> : <><IconPlus /> Agregar</>}
          </button>

          {modoAgregar && (
            <div className="gv-editor-body">
              <EditorNuevas
                colores={colores} coloresSel={coloresSel} toggleColor={toggleColor}
                tallasSel={tallasSel} toggleTalla={toggleTalla}
                matriz={matriz} setStock={setStock}
                onGuardar={guardarMatrizConectado}
                labelGuardar="Guardar variantes"
                guardando={guardando}
                colorBloqueado={colorBloqueado}
                tallasBloqueadas={tallasBloqueadas}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subcomponente reutilizable: editor de nuevas variantes (matriz) ──────────
function EditorNuevas({ colores, coloresSel, toggleColor, tallasSel, toggleTalla, matriz, setStock, onGuardar, labelGuardar, guardando, colorBloqueado, tallasBloqueadas = [] }) {
  const tallaStepNum  = colorBloqueado ? 1 : 2;
  const stockStepNum  = colorBloqueado ? 2 : 3;
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
          <p className="gv-step-label"><span className="gv-step-num">{stockStepNum}</span> Define el stock por combinación</p>
          <div className="gv-table-wrap">
            <table className="gv-matrix-table">
              <thead>
                <tr>
                  <th className="gv-th-color">Color</th>
                  {tallasSel.map(t => <th key={t} className="gv-th-talla">{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {coloresSel.map(c => (
                  <tr key={c.id_color}>
                    <td className="gv-td-color">
                      <div className="gv-color-cell">
                        <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                        {c.nombre}
                      </div>
                    </td>
                    {tallasSel.map(t => (
                      <td key={t} className="gv-td-stock">
                        <input
                          type="number" min={0} className="gv-stock-input"
                          value={matriz[c.id_color]?.[t] ?? 0}
                          onChange={e => setStock(c.id_color, t, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="gv-btn-guardar" onClick={onGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : <><IconCheck /> {labelGuardar}</>}
          </button>
        </div>
      )}
    </>
  );
}