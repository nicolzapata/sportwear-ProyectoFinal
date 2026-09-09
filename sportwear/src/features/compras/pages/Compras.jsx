// src/pages/compras/Compras.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
// Compras.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Compras.layout.css';
import './Compras.modals.css';
import './Compras.responsive.css';
import './Compras.cards.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import FilterToggle from "../../../shared/components/FilterToggle";
import ComprasTable from "../components/compras/ComprasTable";
import CompraListItem from "../components/compras/CompraListItem";
import NuevaCompraModal from "../components/compras/NuevaCompraModal";
import CompraDetalleModal from "../components/compras/CompraDetalleModal";
import { formInicial } from "../utils/comprasHelpers";
import { useCompras } from "../hooks/useCompras";

// ── Iconos del selector de vista (lista+detalle / tabla) — mismos que Pedidos/Proveedores/Ventas ──
const IconVistaTarjetas = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconVistaTabla = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const OPCIONES_VISTA = [
  { valor: "tarjetas", etiqueta: <span title="Lista y detalle"><IconVistaTarjetas /></span> },
  { valor: "tabla",    etiqueta: <span title="Tabla"><IconVistaTabla /></span> },
];

export default function Compras() {
  const c = useCompras();
  const [vista, setVista] = useState(() => localStorage.getItem("sz_compras_vista") || "tarjetas");

  // Al cambiar de vista se cierra cualquier panel de ver detalle/editar
  // abierto — evita pasar a la tabla con el panel acoplado todavía montado.
  const cambiarVista = (v) => {
    setVista(v);
    localStorage.setItem("sz_compras_vista", v);
    c.cerrarDetalle();
    c.setFilaAbierta(null);
  };

  // Vista "lista + detalle": mantiene seleccionada la primera compra
  // visible de la página actual, igual que en Roles/Proveedores/Pedidos/Ventas.
  useEffect(() => {
    if (vista !== 'tarjetas') return;
    if (c.compras.length === 0) { c.cerrarDetalle(); return; }
    if (!c.compras.some((x) => x.id_compra === c.verDetalle?.id_compra)) {
      c.abrirDetalle(c.compras[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, c.compras]);

  if (c.cargando) return <Loader text="Cargando compras..." />;

  return (
    <div className="compras-container">
      {c.error && <div className="compras-error-banner"><IconX /> {c.error}</div>}

      <div className="compras-actions-bar">
        <div className="compras-actions-left">
          <div className="compras-search-wrapper">
            <span className="compras-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="compras-search-input"
              placeholder="Buscar por proveedor, N° orden o ID..."
              value={c.busqueda}
              onChange={(e) => c.setBusqueda(e.target.value)}
            />
            {c.busqueda && (
              <button className="compras-search-clear" onClick={() => c.setBusqueda("")}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="compras-actions-right">
          {c.tienePerm('Compras.crear') && (
            <button
              className="compras-btn-primary"
              onClick={() => { c.setForm(formInicial()); c.setErrores({}); c.setModal(true); }}
            >
              <span>+</span> Nueva compra
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/compras", { params: { q: c.busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Proveedor", key: "proveedor" },
              { header: "N° Orden", key: "numero_orden" },
              { header: "Productos", value: (row) => row.items?.length || 0 },
              { header: "Total", key: "total" },
              { header: "Fecha", value: (row) => row.fecha?.toString().split("T")[0] },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="compras"
            titulo="Compras"
          />
          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
        </div>
      </div>

      <div className="compras-results-count">
        {`${c.totalCompras} compra${c.totalCompras !== 1 ? 's' : ''} encontrada${c.totalCompras !== 1 ? 's' : ''}`}
      </div>

      {vista === "tabla" ? (
      <div className={c.verDetalle ? "compras-contenido-split" : "compras-contenido"}>
        <ComprasTable
          compras={c.compras} tienePerm={c.tienePerm}
          filaAbierta={c.filaAbierta} setFilaAbierta={c.setFilaAbierta}
          cambiandoEstadoTabla={c.cambiandoEstadoTabla} cambiarEstadoDesdeTabla={c.cambiarEstadoDesdeTabla}
          abrirDetalle={c.abrirDetalle} abrirEdicion={c.abrirEdicion}
          totalPaginas={c.totalPaginas} pagina={c.pagina} setPagina={c.setPagina} totalCompras={c.totalCompras}
        />

        {c.verDetalle && (
          <div className="compras-panel-columna">
            <CompraDetalleModal
              verDetalle={c.verDetalle} cerrarDetalle={c.cerrarDetalle} tienePerm={c.tienePerm}
              modoEdicion={c.modoEdicion} setModoEdicion={c.setModoEdicion}
              estadoEditado={c.estadoEditado} setEstadoEditado={c.setEstadoEditado}
              guardandoEstado={c.guardandoEstado} guardarEstado={c.guardarEstado}
            />
          </div>
        )}
      </div>
      ) : c.compras.length === 0 ? (
        <p className="cpr-empty">{c.busqueda ? `No se encontraron resultados para "${c.busqueda}".` : "No hay compras para mostrar."}</p>
      ) : (
        <div className="cpr-lista-detalle">
          <div className="cpr-lista">
            {c.compras.map((compra) => (
              <CompraListItem
                key={compra.id_compra} compra={compra}
                seleccionado={compra.id_compra === c.verDetalle?.id_compra}
                onSeleccionar={(id) => {
                  const compra2 = c.compras.find((x) => x.id_compra === id);
                  if (compra2) c.abrirDetalle(compra2);
                }}
              />
            ))}
          </div>

          <CompraDetalleModal
            verDetalle={c.verDetalle} cerrarDetalle={c.cerrarDetalle} tienePerm={c.tienePerm}
            modoEdicion={c.modoEdicion} setModoEdicion={c.setModoEdicion}
            estadoEditado={c.estadoEditado} setEstadoEditado={c.setEstadoEditado}
            guardandoEstado={c.guardandoEstado} guardarEstado={c.guardarEstado}
          />
        </div>
      )}

      {c.totalPaginas > 1 && vista === "tarjetas" && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => c.setPagina((p) => Math.max(p - 1, 1))} disabled={c.pagina === 1}>‹</button>
          {Array.from({ length: c.totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`paginador-btn ${n === c.pagina ? "paginador-btn-active" : ""}`} onClick={() => c.setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => c.setPagina((p) => Math.min(p + 1, c.totalPaginas))} disabled={c.pagina === c.totalPaginas}>›</button>
          <span className="paginador-info">Página {c.pagina} de {c.totalPaginas} · {c.totalCompras} registros</span>
        </div>
      )}

      <NuevaCompraModal
        modal={c.modal} setModal={c.setModal} guardando={c.guardando} guardar={c.guardar}
        form={c.form} setForm={c.setForm} errores={c.errores} setErrores={c.setErrores}
        proveedores={c.proveedores} productos={c.productos}
        actualizarItem={c.actualizarItem} agregarItem={c.agregarItem} quitarItem={c.quitarItem}
        toggleMismoPrecio={c.toggleMismoPrecio}
        subtotal={c.subtotal} totalCompra={c.totalCompra}
      />
    </div>
  );
}
