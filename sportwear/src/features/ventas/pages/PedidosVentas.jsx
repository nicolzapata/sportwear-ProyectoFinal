// src/pages/pedidosVentas/PedidosVentas.jsx
// PedidosVentas.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import './PedidosVentas.layout.css';
import './PedidosVentas.modals.css';
import './PedidosVentas.form.css';
import Loader from "../../../shared/components/Loader";
import Select from "../../../shared/components/Select";
import { IconSearch, IconX } from "../../../shared/components/Icons";
import OrigenFilterToggle from "../components/pedidos-ventas/OrigenFilterToggle";
import VentasTable from "../components/pedidos-ventas/VentasTable";
import VentaDetalleModal from "../components/pedidos-ventas/VentaDetalleModal";
import AbonosModal from "../components/pedidos-ventas/AbonosModal";
import NuevaVentaModal from "../components/pedidos-ventas/NuevaVentaModal";
import AnularVentaModal from "../components/pedidos-ventas/AnularVentaModal";
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

export default function PedidosVentas() {
  const v = usePedidosVentas();

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
          <button className="btn-print" onClick={() => window.print()} title="Imprimir reporte"><IconReporte /></button>
        </div>
      </div>

      <div className="pedidosventas-results-count">
        {`${v.total} venta${v.total !== 1 ? 's' : ''} encontrada${v.total !== 1 ? 's' : ''}`}
      </div>

      <VentasTable
        datos={v.datos} cargando={v.cargando} tienePerm={v.tienePerm}
        filaAbierta={v.filaAbierta} setFilaAbierta={v.setFilaAbierta}
        cambiandoEstado={v.cambiandoEstado} cambiarEstado={v.cambiarEstado}
        setVerDetalle={v.setVerDetalle} setAbonosModal={v.setAbonosModal}
        totalPaginas={v.totalPaginas} pagina={v.pagina} setPagina={v.setPagina} total={v.total}
      />

      {/* ── Modal "ver detalle" — panel único tipo factura (sin stepper) ── */}
      <VentaDetalleModal verDetalle={v.verDetalle} setVerDetalle={v.setVerDetalle} />

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
    </div>
  );
}
