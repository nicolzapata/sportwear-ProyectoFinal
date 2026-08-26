// src/pages/compras/Compras.jsx
import api from "../../../shared/services/api";
// Compras.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Compras.layout.css';
import './Compras.modals.css';
import './Compras.responsive.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import ComprasTable from "../components/compras/ComprasTable";
import NuevaCompraModal from "../components/compras/NuevaCompraModal";
import CompraDetalleModal from "../components/compras/CompraDetalleModal";
import { formInicial } from "../utils/comprasHelpers";
import { useCompras } from "../hooks/useCompras";

export default function Compras() {
  const c = useCompras();

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
        </div>
      </div>

      <div className="compras-results-count">
        {`${c.totalCompras} compra${c.totalCompras !== 1 ? 's' : ''} encontrada${c.totalCompras !== 1 ? 's' : ''}`}
      </div>

      <ComprasTable
        compras={c.compras} tienePerm={c.tienePerm}
        filaAbierta={c.filaAbierta} setFilaAbierta={c.setFilaAbierta}
        cambiandoEstadoTabla={c.cambiandoEstadoTabla} cambiarEstadoDesdeTabla={c.cambiarEstadoDesdeTabla}
        abrirDetalle={c.abrirDetalle} abrirEdicion={c.abrirEdicion}
        totalPaginas={c.totalPaginas} pagina={c.pagina} setPagina={c.setPagina} totalCompras={c.totalCompras}
      />

      <NuevaCompraModal
        modal={c.modal} setModal={c.setModal} guardando={c.guardando} guardar={c.guardar}
        form={c.form} setForm={c.setForm} errores={c.errores} setErrores={c.setErrores}
        proveedores={c.proveedores} productos={c.productos}
        actualizarItem={c.actualizarItem} agregarItem={c.agregarItem} quitarItem={c.quitarItem}
        toggleMismoPrecio={c.toggleMismoPrecio}
        subtotal={c.subtotal} totalCompra={c.totalCompra}
      />

      <CompraDetalleModal
        verDetalle={c.verDetalle} cerrarDetalle={c.cerrarDetalle} tienePerm={c.tienePerm}
        modoEdicion={c.modoEdicion} setModoEdicion={c.setModoEdicion}
        estadoEditado={c.estadoEditado} setEstadoEditado={c.setEstadoEditado}
        guardandoEstado={c.guardandoEstado} guardarEstado={c.guardarEstado}
      />
    </div>
  );
}
