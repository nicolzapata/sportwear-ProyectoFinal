// src/pages/pedidosVentas/PedidosVentas.jsx
// PedidosVentas.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import { useState, useEffect } from "react";
import './PedidosVentas.layout.css';
import './PedidosVentas.modals.css';
import './PedidosVentas.form.css';
import './PedidosVentas.cards.css';
import Loader from "../../../shared/components/Loader";
import Select from "../../../shared/components/Select";
import FilterToggle from "../../../shared/components/FilterToggle";
import { IconSearch, IconX, IconSettings } from "../../../shared/components/Icons";
import OrigenFilterToggle from "../components/pedidos-ventas/OrigenFilterToggle";
import VentasTable from "../components/pedidos-ventas/VentasTable";
import VentaListItem from "../components/pedidos-ventas/VentaListItem";
import VentaDetalleModal from "../components/pedidos-ventas/VentaDetalleModal";
import AbonosModal from "../components/pedidos-ventas/AbonosModal";
import NuevaVentaModal from "../components/pedidos-ventas/NuevaVentaModal";
import AnularVentaModal from "../components/pedidos-ventas/AnularVentaModal";
import MetodosPagoModal from "../components/pedidos-ventas/MetodosPagoModal";
import { usePedidosVentas } from "../hooks/usePedidosVentas";

// ── NUEVO: ícono propio de "reporte" (documento con líneas + gráfica
// pequeña) — antes se usaba IconPrint, que no se leía como un reporte. ──
const IconReporte = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
);

// ── Iconos del selector de vista (lista+detalle / tabla) — mismos que Pedidos/Proveedores ──
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

export default function PedidosVentas() {
  const v = usePedidosVentas();
  const [vista, setVista] = useState(() => localStorage.getItem("sz_ventas_vista") || "tarjetas");

  // Al cambiar de vista se cierra cualquier panel de ver detalle abierto —
  // evita pasar a la tabla con el panel acoplado de tarjetas todavía montado.
  const cambiarVista = (val) => {
    setVista(val);
    localStorage.setItem("sz_ventas_vista", val);
    v.setVerDetalle(null);
    v.setFilaAbierta(null);
  };

  // Vista "lista + detalle": mantiene seleccionada la primera venta visible
  // de la página actual, igual que en Roles/Proveedores/Pedidos.
  useEffect(() => {
    if (vista !== 'tarjetas') return;
    if (v.datos.length === 0) { v.setVerDetalle(null); return; }
    if (!v.datos.some((d) => d.id_venta === v.verDetalle?.id_venta)) {
      v.abrirDetalle(v.datos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, v.datos]);

  if (v.cargando && !v.primerCargaHecha.current) return <Loader text="Cargando ventas..." />;

  if (v.errorMsg) return (
    <div className="pedidosventas-container">
      <div className="pedidosventas-error-banner"><IconX /> {v.errorMsg}</div>
    </div>
  );

  return (
    <div className="pedidosventas-container">
      <div className="pedidosventas-actions-bar">
        <div className="pedidosventas-actions-left">
          <div className="pedidosventas-search-wrapper">
            <span className="pedidosventas-search-icon"><IconSearch /></span>
            <input type="text" className="pedidosventas-search-input" placeholder="Buscar por cliente o ID..." value={v.busqueda} onChange={(e) => v.setBusqueda(e.target.value)} />
            {v.busqueda && <button className="pedidosventas-search-clear" onClick={() => v.setBusqueda("")}><IconX /></button>}
          </div>
          <OrigenFilterToggle filtroOrigen={v.filtroOrigen} setFiltroOrigen={v.setFiltroOrigen} setPagina={v.setPagina} />
          {/* ── NUEVO: filtro de estado de pago — a propósito como
              desplegable y no como otra píldora, para no verse como una
              copia del toggle de Cliente/Admin de al lado. ── */}
          <Select
            className="pedidosventas-filtro-estado-select"
            value={v.filtroEstadoPago}
            onChange={(e) => { v.setFiltroEstadoPago(e.target.value); v.setPagina(1); }}
          >
            <option value="">Todas las ventas</option>
            <option value="Pagado">Realizadas</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Anulado">Anuladas</option>
          </Select>
        </div>
        <div className="pedidosventas-actions-right">
          {v.tienePerm('Ventas.crear') && (
            <button className="pedidosventas-btn-primary" onClick={v.abrirNuevaVenta}>
              <span>+</span> Nueva venta
            </button>
          )}
          {v.tienePerm('Ventas.crear') && (
            <button className="btn-print" onClick={() => v.setModalMetodos(true)} title="Métodos de pago"><IconSettings /></button>
          )}
          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
          <button className="btn-print" onClick={() => window.print()} title="Imprimir reporte"><IconReporte /></button>
        </div>
      </div>

      <div className="pedidosventas-results-count">
        {`${v.total} venta${v.total !== 1 ? 's' : ''} encontrada${v.total !== 1 ? 's' : ''}`}
      </div>

      {vista === "tabla" ? (
        <div className={v.verDetalle ? "pedidosventas-contenido-split" : "pedidosventas-contenido"}>
          <VentasTable
            datos={v.datos} cargando={v.cargando} tienePerm={v.tienePerm}
            filaAbierta={v.filaAbierta} setFilaAbierta={v.setFilaAbierta}
            cambiandoEstado={v.cambiandoEstado} cambiarEstado={v.cambiarEstado}
            setVerDetalle={v.abrirDetalle} setAbonosModal={v.setAbonosModal}
            totalPaginas={v.totalPaginas} pagina={v.pagina} setPagina={v.setPagina} total={v.total}
          />

          {v.verDetalle && (
            <div className="pedidosventas-panel-columna">
              <VentaDetalleModal
                verDetalle={v.verDetalle} setVerDetalle={v.setVerDetalle} cargandoDetalle={v.cargandoDetalle}
                tienePerm={v.tienePerm} setAbonosModal={v.setAbonosModal}
              />
            </div>
          )}
        </div>
      ) : v.datos.length === 0 ? (
        <p className="vta-empty">{v.busqueda ? `No se encontraron resultados para "${v.busqueda}".` : "No hay ventas para mostrar."}</p>
      ) : (
        <div className="vta-lista-detalle">
          <div className="vta-lista">
            {v.datos.map((venta) => (
              <VentaListItem
                key={venta.id_venta} venta={venta}
                seleccionado={venta.id_venta === v.verDetalle?.id_venta}
                onSeleccionar={(id) => {
                  const venta2 = v.datos.find((d) => d.id_venta === id);
                  if (venta2) v.abrirDetalle(venta2);
                }}
              />
            ))}
          </div>

          <VentaDetalleModal
            verDetalle={v.verDetalle} setVerDetalle={v.setVerDetalle} cargandoDetalle={v.cargandoDetalle}
            tienePerm={v.tienePerm} setAbonosModal={v.setAbonosModal}
          />
        </div>
      )}

      {v.totalPaginas > 1 && vista === "tarjetas" && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => v.setPagina((p) => Math.max(p - 1, 1))} disabled={v.pagina === 1}>‹</button>
          {Array.from({ length: v.totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`paginador-btn ${n === v.pagina ? "paginador-btn-active" : ""}`} onClick={() => v.setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => v.setPagina((p) => Math.min(p + 1, v.totalPaginas))} disabled={v.pagina === v.totalPaginas}>›</button>
          <span className="paginador-info">Página {v.pagina} de {v.totalPaginas} · {v.total} registros</span>
        </div>
      )}

      <AbonosModal
        abonosModal={v.abonosModal} setAbonosModal={v.setAbonosModal} tienePerm={v.tienePerm}
        formAbono={v.formAbono} setFormAbono={v.setFormAbono}
        erroresAbono={v.erroresAbono} setErroresAbono={v.setErroresAbono}
        metodosPago={v.metodosPago} guardandoAbono={v.guardandoAbono} agregarAbono={v.agregarAbono}
      />

      {/* ── Modal "Nueva venta" ── */}
      <NuevaVentaModal
        modalVenta={v.modalVenta} setModalVenta={v.setModalVenta}
        guardandoVenta={v.guardandoVenta} guardarVenta={v.guardarVenta}
        formVenta={v.formVenta} setFormVenta={v.setFormVenta}
        erroresVenta={v.erroresVenta} setErroresVenta={v.setErroresVenta}
        clientes={v.clientes} productos={v.productos} metodosPago={v.metodosPago}
        busquedaCliente={v.busquedaCliente} setBusquedaCliente={v.setBusquedaCliente}
        clienteDropdownAbierto={v.clienteDropdownAbierto} setClienteDropdownAbierto={v.setClienteDropdownAbierto}
        clienteInputRef={v.clienteInputRef}
        cargandoDatosVenta={v.cargandoDatosVenta} errorDatosVenta={v.errorDatosVenta}
        cargandoCredito={v.cargandoCredito} creditoInfo={v.creditoInfo}
        actualizarItemVenta={v.actualizarItemVenta} agregarItemVenta={v.agregarItemVenta}
        quitarItemVenta={v.quitarItemVenta} errorItemStock={v.errorItemStock}
        subtotalVenta={v.subtotalVenta} totalVenta={v.totalVenta}
        opcionesCuotasVenta={v.opcionesCuotasVenta}
      />

      <AnularVentaModal
        venta={v.modalAnular} onClose={() => v.setModalAnular(null)}
        motivo={v.motivoAnulacion} setMotivo={v.setMotivoAnulacion}
        guardando={v.cambiandoEstado} onConfirmar={v.confirmarAnularVenta}
      />

      {v.modalMetodos && (
        <MetodosPagoModal
          setModalMetodos={v.setModalMetodos} nuevoMetodo={v.nuevoMetodo} setNuevoMetodo={v.setNuevoMetodo}
          crearMetodo={v.crearMetodo} metodosPagoTodos={v.metodosPagoTodos} toggleMetodoEstado={v.toggleMetodoEstado}
        />
      )}
    </div>
  );
}
