// src/components/GestVariantes.jsx
import "./GestVariantes.css";
import { IconPlus, IconX } from "./gest-variantes/icons";
import ChipsColorList from "./gest-variantes/ChipsColorList";
import EditorNuevas from "./gest-variantes/EditorNuevas";
import { useGestVariantes } from "../hooks/useGestVariantes";

/**
 * GestVariantes
 *
 * Modos de operación:
 * 1. idProducto definido  → modo conectado: lee/escribe variantes en la API.
 * 2. idProducto null/undefined → modo local: acumula variantes pendientes y
 *    las emite por `onPendingChange(pendingList)` cada vez que cambian.
 */
export default function GestVariantes(props) {
  const gv = useGestVariantes(props);

  if (gv.loading) return (
    <div className="gv-loading"><div className="gv-spinner" /> Cargando variantes...</div>
  );

  const gruposConStock = gv.modoConectado ? gv.gruposConStock : gv.gruposConStockPend;
  const gruposSinStock = gv.modoConectado ? gv.gruposSinStock : gv.gruposSinStockPend;
  const listaVacia = gv.modoConectado ? gv.variantes.length === 0 : gv.pendingVariantes.length === 0;
  const listaOrigen = gv.modoConectado ? gv.variantes : gv.pendingVariantes;

  const onEliminar = gv.modoConectado
    ? (g, talla, id_variante) => gv.eliminarVariante(id_variante, g.id_color)
    : (g, talla) => gv.eliminarPendiente(g.id_color, talla);
  const onAgregarTalla = (g) => gv.agregarTallaAColor(g, listaOrigen.filter(v => v.id_color === g.id_color).map(v => v.talla));

  return (
    <div className="gv-container">
      <div className="gv-header">
        <span className="gv-title">Tallas y colores</span>
        {gv.modoConectado ? (
          gv.variantes.length > 0 && (
            <div className="gv-header-actions">
              <span className="gv-stock-total">Stock total: <strong>{gv.stockTotal}</strong> uds</span>
            </div>
          )
        ) : (
          gv.pendingVariantes.length > 0 && (
            <span className="gv-stock-total">
              <strong>{gv.pendingVariantes.length}</strong> combinación(es) lista(s)
            </span>
          )
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
            <EditorNuevas
              colores={gv.colores} coloresSel={gv.coloresSel} toggleColor={gv.toggleColor}
              tallasSel={gv.tallasSel} toggleTalla={gv.toggleTalla}
              onGuardar={gv.modoConectado ? gv.guardarMatrizConectado : gv.guardarMatrizLocal}
              labelGuardar={gv.modoConectado ? "Guardar variantes" : "Agregar a la lista"}
              guardando={gv.modoConectado ? gv.guardando : false}
              colorBloqueado={gv.colorBloqueado}
              tallasBloqueadas={gv.tallasBloqueadas}
            />
          </div>
        )}
      </div>
    </div>
  );
}
