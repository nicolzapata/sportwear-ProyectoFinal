// src/pages/clientes/Clientes.jsx
import api from "../../../shared/services/api";
import ModalSteps from "../../../shared/components/ModalSteps";
import ModalDetalle from "../../../shared/components/ModalDetalle";
import Toast from "../../../shared/components/Toast";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import "./Clientes.css";
import { IconSearch, IconX } from "../../../shared/components/Icons";
import { PasoDatosCliente, PasoUbicacionCliente, PasoClasificacionCliente } from "../components/clientes/ClienteFormSteps";
import { DetalleDatosCliente, DetalleUbicacionCliente, DetalleClasificacionCliente } from "../components/clientes/ClienteDetalleSteps";
import ClientesTable from "../components/clientes/ClientesTable";
import { useClientes } from "../hooks/useClientes";

export default function Clientes() {
  const c = useClientes();

  if (c.loading) return <Loader text="Cargando clientes..." />;
  if (c.error) return <div style={{ padding: 32, color: "var(--danger)" }}>{c.error}</div>;

  return (
    <div className="clientes-container">
      <div className="clientes-actions-bar">
        <div className="clientes-search-wrapper">
          <span className="clientes-search-icon"><IconSearch /></span>
          <input type="text" className="clientes-search-input" placeholder="Buscar por nombre o documento..." value={c.busqueda} onChange={(e) => c.setBusqueda(e.target.value)} />
          {c.busqueda && <button className="clientes-search-clear" onClick={() => c.setBusqueda("")}><IconX /></button>}
          </div>
          <div className="clientes-actions-right">
            {c.tienePerm('Clientes.crear') && (
              <button className="clientes-btn-primary" onClick={c.abrirRegistrar}><span>+</span> Nuevo cliente</button>
            )}
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/clientes/con-ventas", { params: { q: c.busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Cliente", key: "nombre" },
                { header: "Documento", value: (row) => `${row.tipo_doc} ${row.documento}` },
                { header: "Teléfono", value: (row) => row.telefono || "—" },
                { header: "Barrio", value: (row) => (row.barrio_nombre ? `${row.barrio_nombre} (${row.zona})` : "—") },
                { header: "Compras", value: (row) => row.total_compras || 0 },
                { header: "Total gastado", value: (row) => `$${Number(row.total_gastado || 0).toLocaleString("es-CO")}` },
                ...(c.tienePerm('Clientes.estado') ? [{ header: "Estado", key: "estado" }] : []),
              ]}
              nombreArchivo="clientes"
              titulo="Clientes"
            />
          </div>
      </div>

      <ClientesTable
        datos={c.datos}
        tienePerm={c.tienePerm}
        toggleEstado={c.toggleEstado}
        setVerDetalle={c.setVerDetalle}
        abrirEditar={c.abrirEditar}
        totalPaginas={c.totalPaginas}
        pagina={c.pagina}
        setPagina={c.setPagina}
        totalClientes={c.totalClientes}
      />

      {c.modal && (
        <ModalSteps
          titulo={c.editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          step={c.pasoModal} onStepChange={c.setPasoModal}
          onClose={() => c.setModal(false)}
          onGuardar={c.guardar}
          validaciones={[c.validarPasoDatos, c.validarPasoUbicacion, c.validarPasoClasificacion]}
          labelGuardar={c.editar ? "Actualizar" : "Registrar"}
        >
          <PasoDatosCliente form={c.form} setForm={c.setForm} errores={c.errores} setErrores={c.setErrores} editar={c.editar} verificarDocumentoDuplicado={c.verificarDocumentoDuplicado} verificarEmailDuplicado={c.verificarEmailDuplicado} />
          <PasoUbicacionCliente form={c.form} setForm={c.setForm} zonas={c.zonas} barFiltrados={c.barFiltrados} handleZona={c.handleZona} />
          <PasoClasificacionCliente form={c.form} setForm={c.setForm} errores={c.errores} setErrores={c.setErrores} editar={c.editar} />
        </ModalSteps>
      )}

      {c.verDetalle && (
        <ModalDetalle
          titulo="Detalle del cliente"
          subtitulo={c.verDetalle.nombre}
          badge={<span className={`tabla-status ${c.verDetalle.estado === "Activo" ? 'activo' : 'inactivo'}`}>{c.verDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => c.setVerDetalle(null)}
          onEditar={c.tienePerm('Clientes.editar') ? () => { c.setVerDetalle(null); c.abrirEditar(c.verDetalle); } : undefined}
        >
          <DetalleDatosCliente c={c.verDetalle} />
          <DetalleUbicacionCliente c={c.verDetalle} />
          <DetalleClasificacionCliente c={c.verDetalle} />
        </ModalDetalle>
      )}
      <Toast toast={c.toast} />
    </div>
  );
}
