// src/components/GestVariantes.jsx
import "./GestVariantes.css";
import { IconPlus, IconX, IconCheck } from "./gest-variantes/icons";
import { IconPalette, IconStar } from "../../../shared/components/galeria-imagenes/icons";
import ChipsColorList from "./gest-variantes/ChipsColorList";
import EditorNuevas from "./gest-variantes/EditorNuevas";
import { useGestVariantes } from "../hooks/useGestVariantes";
import { TALLAS } from "../utils/gestVariantesHelpers";

/**
 * GestVariantes
 *
 * Modos de operación:
 * 1. idProducto definido  → modo conectado: lee/escribe variantes en la API,
 *    con stock real, agrupado en "Con stock"/"Sin stock" y un editor que se
 *    abre bajo demanda (sin cambios respecto al diseño original).
 * 2. idProducto null/undefined → modo local (crear producto): acumula
 *    variantes pendientes y las emite por `onPendingChange(pendingList)`.
 *    Usa un diseño propio de 3 tarjetas siempre visibles (paleta de colores,
 *    escala de tallas, matriz de SKUs generados) porque aquí todo nace sin
 *    stock — no aplica la vista de "Con stock"/"Sin stock" del modo conectado.
 */
export default function GestVariantes(props) {
  const gv = useGestVariantes(props);

  if (gv.loading) return (
    <div className="gv-loading"><div className="gv-spinner" /> Cargando variantes...</div>
  );

  if (!gv.modoConectado) return <VariantesNuevoProducto gv={gv} />;

  const gruposConStock = gv.gruposConStock;
  const gruposSinStock = gv.gruposSinStock;
  const listaVacia = gv.variantes.length === 0;
  const listaOrigen = gv.variantes;

  const onEliminar = (g, talla, id_variante) => gv.eliminarVariante(id_variante, g.id_color);
  const onAgregarTalla = (g) => gv.agregarTallaAColor(g, listaOrigen.filter(v => v.id_color === g.id_color).map(v => v.talla));

  return (
    <div className="gv-container">
      <div className="gv-header">
        <span className="gv-title">Tallas y colores</span>
        {gv.variantes.length > 0 && (
          <div className="gv-header-actions">
            <span className="gv-stock-total">Stock total: <strong>{gv.stockTotal}</strong> uds</span>
          </div>
        )}
      </div>

      {gv.error && <p className="gv-error">{gv.error}</p>}

      {/* ── Variantes existentes: chips agrupados por color, con la sección
          "Sin stock" separada — mismo estilo que "ver detalle". ── */}
      {gruposConStock.length > 0 && (
        <ChipsColorList grupos={gruposConStock} onEliminar={onEliminar} onAgregarTalla={onAgregarTalla} />
      )}
      {gruposSinStock.length > 0 && (
        <>
          <div className="gv-chips-divider"><span>Sin stock</span></div>
          <ChipsColorList grupos={gruposSinStock} onEliminar={onEliminar} onAgregarTalla={onAgregarTalla} />
        </>
      )}

      {listaVacia && !gv.modoAgregar && (
        <p className="gv-empty">Agrega colores y tallas abajo.</p>
      )}

      {/* ── Panel agregar nuevas variantes ── */}
      <div className="gv-editor">
        <button className="gv-toggle-editor" onClick={gv.cerrarOAbrirEditor}>
          {gv.modoAgregar ? <><IconX /> Cancelar</> : <><IconPlus /> Agregar</>}
        </button>

        {gv.modoAgregar && (
          <div className="gv-editor-body">
            {gv.origenDeteccion && gv.principalesSel.length > 0 && (
              <div className="gv-sugerencia-colores">
                <IconPalette />
                <span>
                  {gv.principalesSel.length > 1 ? (
                    <>Colores detectados en la foto — parecen repartirse en partes similares (mitad y mitad), así que se marcaron <strong>ambos como principales</strong>.</>
                  ) : (
                    <>Colores detectados en la foto — toca la estrella para cambiar cuál es el <strong>principal</strong>.</>
                  )}
                  {" "}Revisa, agrega o quita los que quieras antes de guardar.
                </span>
              </div>
            )}
            <EditorNuevas
              colores={gv.colores} coloresSel={gv.coloresSel} toggleColor={gv.toggleColor}
              tallasSel={gv.tallasSel} toggleTalla={gv.toggleTalla}
              onGuardar={gv.guardarMatrizConectado}
              labelGuardar="Guardar variantes"
              guardando={gv.guardando}
              colorBloqueado={gv.colorBloqueado}
              tallasBloqueadas={gv.tallasBloqueadas}
              principalesSel={gv.principalesSel}
              onTogglePrincipal={gv.togglePrincipal}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Modo local (crear producto): paleta de colores + escala de tallas siempre
// visibles, y la matriz de SKUs resultante debajo — todo nace en "Pre-Stock"
// (sin stock), así que no aplica agrupar por con-stock/sin-stock.
// ═══════════════════════════════════════════════════════════════════════
function VariantesNuevoProducto({ gv }) {
  const coloresActivos = new Set(gv.pendingVariantes.map(v => v.id_color)).size;
  const tallasAsignadas = new Set(gv.pendingVariantes.map(v => v.talla)).size;

  return (
    <div className="gv-container gv-nuevo">
      <div className="gv-header">
        <span className="gv-title">02. Variantes &amp; atributos físicos</span>
        {gv.pendingVariantes.length > 0 && (
          <span className="gv-resumen-chip">
            {coloresActivos} color{coloresActivos === 1 ? "" : "es"} activo{coloresActivos === 1 ? "" : "s"}
            {" · "}{tallasAsignadas} talla{tallasAsignadas === 1 ? "" : "s"} asignada{tallasAsignadas === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {gv.error && <p className="gv-error">{gv.error}</p>}

      {/* Tarjeta 1: paleta cromática */}
      <div className="gv-card">
        <div className="gv-card-header">
          <p className="gv-card-titulo"><span className="gv-step-num">1</span> Paleta cromática del producto</p>
          <button type="button" className="gv-link-btn" onClick={gv.formularioColorAbierto ? gv.cerrarFormularioColor : gv.abrirFormularioColor}>
            {gv.formularioColorAbierto ? "Cancelar" : "+ Color personalizado"}
          </button>
        </div>

        {gv.origenDeteccion && gv.principalesSel.length > 0 && (
          <div className="gv-sugerencia-colores">
            <IconPalette />
            <span>
              {gv.principalesSel.length > 1 ? (
                <>Colores detectados en la foto — parecen repartirse en partes similares (mitad y mitad), así que se marcaron <strong>ambos como principales</strong>.</>
              ) : (
                <>Colores detectados en la foto — toca la estrella para cambiar cuál es el <strong>principal</strong>.</>
              )}
              {" "}Revisa, agrega o quita los que quieras.
            </span>
          </div>
        )}

        {gv.formularioColorAbierto && (
          <div className="gv-form-color-personalizado">
            <input type="color" className="gv-color-picker" value={gv.nuevoColor.codigo_hex}
              onChange={e => gv.setNuevoColor(p => ({ ...p, codigo_hex: e.target.value }))} />
            <input type="text" className="gv-color-nombre-input" placeholder="Nombre del color" maxLength={40}
              value={gv.nuevoColor.nombre}
              onChange={e => gv.setNuevoColor(p => ({ ...p, nombre: e.target.value }))} />
            <button type="button" className="gv-btn-guardar gv-btn-guardar-chico" onClick={gv.guardarColorPersonalizado} disabled={gv.guardandoNuevoColor}>
              {gv.guardandoNuevoColor ? "Guardando..." : <><IconCheck /> Agregar</>}
            </button>
            {gv.errorNuevoColor && <p className="gv-error">{gv.errorNuevoColor}</p>}
          </div>
        )}

        <div className="gv-color-chips">
          {gv.colores.map(c => {
            const activo = gv.coloresSel.some(x => x.id_color === c.id_color);
            const esPrincipal = activo && gv.principalesSel.includes(c.id_color);
            return (
              <button key={c.id_color} type="button"
                className={`gv-color-chip${activo ? " active" : ""}${esPrincipal ? " principal" : ""}`}
                onClick={() => gv.toggleColor(c)}>
                <span className="gv-chip-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                {c.nombre}
                {activo && (
                  <span
                    className={`gv-chip-star${esPrincipal ? " active" : ""}`}
                    title={esPrincipal ? "Quitar como color principal" : "Marcar como color principal"}
                    onClick={e => { e.stopPropagation(); gv.togglePrincipal(c.id_color); }}
                  >
                    <IconStar />
                  </span>
                )}
                {activo && <span className="gv-chip-check"><IconCheck /></span>}
              </button>
            );
          })}
        </div>
        <p className="gv-card-hint">Toca la estrella (★) en un swatch seleccionado para definirlo como variante líder en catálogo.</p>
      </div>

      {/* Tarjeta 2: escala de tallas */}
      <div className="gv-card">
        <div className="gv-card-header">
          <p className="gv-card-titulo"><span className="gv-step-num">2</span> Escala de tallas aplicables</p>
          <span className="gv-card-actions">
            <button type="button" className="gv-link-btn" onClick={gv.seleccionarTallasEstandar}>Seleccionar estándar (S, M, L)</button>
            <span className="gv-link-sep">|</span>
            <button type="button" className="gv-link-btn" onClick={gv.limpiarTallas}>Limpiar</button>
          </span>
        </div>
        <div className="gv-talla-chips">
          {TALLAS.map(t => (
            <button key={t} type="button" className={`gv-talla-chip${gv.tallasSel.includes(t) ? " active" : ""}`} onClick={() => gv.toggleTalla(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjeta 3: combinaciones listas para confirmar (aparece solo mientras
          hay colores y tallas marcados sin agregar todavía). */}
      {gv.coloresSel.length > 0 && gv.tallasSel.length > 0 && (
        <div className="gv-card">
          <p className="gv-card-titulo">Combinaciones a agregar</p>
          <div className="gv-combo-preview">
            {gv.coloresSel.map(c => (
              <div key={c.id_color} className="gv-combo-preview-row">
                <span className="gv-color-dot" style={{ background: c.codigo_hex || "#ccc" }} />
                <span className="gv-combo-preview-color">{c.nombre}</span>
                <span className="gv-combo-preview-tallas">{gv.tallasSel.join(" · ")}</span>
              </div>
            ))}
          </div>
          <button type="button" className="gv-btn-guardar" onClick={gv.guardarMatrizLocal}>
            <IconCheck /> Agregar a la lista
          </button>
        </div>
      )}

      {/* Tarjeta 4: matriz de SKUs ya confirmados */}
      {gv.pendingVariantes.length > 0 && (
        <div className="gv-card">
          <div className="gv-card-header">
            <p className="gv-card-titulo">Matriz de variantes generadas ({gv.pendingVariantes.length} SKUs)</p>
            <span className="gv-card-note">Todas marcadas en estado &quot;Pre-Stock&quot;</span>
          </div>
          <div className="gv-matriz-lista">
            {gv.gruposSinStockPend.map(g => (
              <div key={g.id_color} className="gv-matriz-row">
                <span className="gv-chip-row-swatch" style={{ background: g.codigo_hex || "#ccc" }} />
                <span className="gv-chip-row-nombre">{g.color_nombre}</span>
                <div className="gv-matriz-tallas">
                  {g.items.map(({ talla }) => (
                    <span key={talla} className="gv-matriz-chip">
                      Talla {talla} · Sin stock
                      <button type="button" onClick={() => gv.eliminarPendiente(g.id_color, talla)} title="Quitar"><IconX /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
