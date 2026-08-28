// src/pages/pagos/PagosAbonos.jsx
// PagosAbonos.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import './PagosAbonos.layout.css';
import './PagosAbonos.modals.css';
import api from "../../../shared/services/api";
import { IconSearch, IconX, IconSettings } from "../../../shared/components/Icons";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import PagosTable from "../components/pagos-abonos/PagosTable";
import FilterToggle from "../../../shared/components/FilterToggle";
import NuevoPagoModal from "../components/pagos-abonos/NuevoPagoModal";
import PagoDetalleModal from "../components/pagos-abonos/PagoDetalleModal";
import MetodosPagoModal from "../components/pagos-abonos/MetodosPagoModal";
import { usePagosAbonos } from "../hooks/usePagosAbonos";

export default function PagosAbonos() {
  const p = usePagosAbonos();

  if (p.cargando && !p.primerCargaHecha.current) return <Loader text="Cargando pagos..." />;
  if (p.errorMsg) return <div style={{ padding: 32, color: "var(--danger)" }}>{p.errorMsg}<button onClick={() => p.cargar()} style={{ marginLeft: 12 }}>Reintentar</button></div>;

  return (
    <div className="pagosabonos-container">
      <div className="pagosabonos-actions-bar">
        <div className="pagosabonos-actions-left">
          <div className="pagosabonos-search-wrapper">
          <span className="pagosabonos-search-icon"><IconSearch /></span>
          <input type="text" className="pagosabonos-search-input" placeholder="Buscar por cliente o ID..." value={p.busqueda} onChange={(e) => p.setBusqueda(e.target.value)} />
          {p.busqueda && <button className="pagosabonos-search-clear" onClick={() => p.setBusqueda("")}><IconX /></button>}
          </div>
          <FilterToggle
            opciones={[
              { valor: "", etiqueta: "Todos" },
              { valor: "Confirmado", etiqueta: "Realizados" },
              { valor: "Pendiente", etiqueta: "Pendientes" },
            ]}
            valor={p.filtroEstado}
            onChange={(val) => { p.setFiltroEstado(val); p.setPagina(1); }}
          />
        </div>
        <div className="pagosabonos-actions-right">
          {p.tienePerm('Pagos.editar') && (
            <button className="btn-print" onClick={() => p.setModalMetodos(true)} title="Gestionar métodos de pago"><IconSettings /></button>
          )}
          {p.tienePerm('Pagos.crear') && (
            <button className="pagosabonos-btn-primary" onClick={p.abrirRegistrarPago}>
              <span>+</span> Nuevo pago
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/pagos", { params: { q: p.busquedaDebounced || undefined, estado: p.filtroEstado || undefined } });
              return data;
            }}
            columnas={[
              { header: "Venta", value: (row) => `V-${String(row.id_venta).padStart(3, "0")}` },
              { header: "Cliente", key: "cliente" },
              { header: "Monto", key: "monto" },
              { header: "Tipo", key: "tipo" },
              { header: "Método", key: "metodo" },
              { header: "Fecha", value: (row) => row.fecha?.toString().split("T")[0] },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="pagos"
            titulo="Pagos y Abonos"
          />
        </div>
      </div>

      <PagosTable
        datos={p.datos} cargando={p.cargando} tienePerm={p.tienePerm}
        filaAbierta={p.filaAbierta} setFilaAbierta={p.setFilaAbierta}
        cambiandoEstado={p.cambiandoEstado} cambiarEstadoPago={p.cambiarEstadoPago}
        setVerDetalle={p.setVerDetalle}
        totalPaginas={p.totalPaginas} pagina={p.pagina} setPagina={p.setPagina} totalPagos={p.totalPagos}
      />

      {/* ── Modal registrar pago: panel único tipo factura ── */}
      {p.modal && (
        <NuevoPagoModal
          cerrarModal={p.cerrarModal} ventas={p.ventas} form={p.form} setForm={p.setForm}
          errores={p.errores} setErrores={p.setErrores} handleVentaChange={p.handleVentaChange}
          errorMonto={p.errorMonto} metodosPago={p.metodosPago} guardando={p.guardando} guardar={p.guardar}
        />
      )}

      {/* ── Modal ver detalle: panel único tipo factura ── */}
      <PagoDetalleModal verDetalle={p.verDetalle} setVerDetalle={p.setVerDetalle} />

      {p.modalMetodos && (
        <MetodosPagoModal
          setModalMetodos={p.setModalMetodos} nuevoMetodo={p.nuevoMetodo} setNuevoMetodo={p.setNuevoMetodo}
          crearMetodo={p.crearMetodo} metodosPago={p.metodosPago} toggleMetodoEstado={p.toggleMetodoEstado}
        />
      )}
    </div>
  );
}
