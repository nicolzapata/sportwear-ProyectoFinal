import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";

export default function ClienteDetalleModal({ clienteDetalle, setClienteDetalle, tienePerm, abrirEditarCliente }) {
  if (!clienteDetalle) return null;

  return (
    <div className="usuarios-modal-overlay" onClick={() => setClienteDetalle(null)}>
      <div className="usuarios-modal usuarios-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal-header">
          <div>
            <h2 className="usuarios-modal-title">{clienteDetalle.nombre}</h2>
            <p className="usuarios-modal-subtitulo">Detalle del cliente</p>
          </div>
          <button className="usuarios-modal-close" onClick={() => setClienteDetalle(null)}><IconX /></button>
        </div>

        <div className="usuarios-modal-body usuarios-factura-body">
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Datos personales</h3>
            <DetalleGrid>
              <DetalleItem label="Tipo documento"     value={clienteDetalle.tipo_doc} />
              <DetalleItem label="N° documento"       value={clienteDetalle.documento} />
              <DetalleItem label="Nombre completo"    value={clienteDetalle.nombre} full />
              <DetalleItem label="Teléfono"           value={clienteDetalle.telefono} />
              <DetalleItem label="Correo electrónico" value={clienteDetalle.email} />
            </DetalleGrid>
          </div>
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Ubicación y clasificación</h3>
            <DetalleGrid>
              <DetalleItem label="Ciudad"             value={clienteDetalle.ciudad} />
              <DetalleItem label="Barrio"             value={clienteDetalle.barrio_nombre} />
              <DetalleItem label="Dirección completa" value={clienteDetalle.direccion} full />
              <DetalleItem label="Pago por cuotas" value={clienteDetalle.permiso_cuotas ? "Permitido" : "Bloqueado"} />
              <DetalleItem label="Estado"          value={clienteDetalle.estado} />
            </DetalleGrid>
          </div>
        </div>

        <div className="usuarios-modal-footer">
          <button className="usuarios-btn-secondary" onClick={() => setClienteDetalle(null)}>Cerrar</button>
          {tienePerm('Clientes.editar') && (
            <button className="usuarios-btn-primary" onClick={() => { setClienteDetalle(null); abrirEditarCliente(clienteDetalle); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
