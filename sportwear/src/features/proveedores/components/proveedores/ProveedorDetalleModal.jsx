import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";

export default function ProveedorDetalleModal({ verDetalle, setVerDetalle, tienePerm, abrirEditar }) {
  if (!verDetalle) return null;

  return (
    <div className="proveedores-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="proveedores-modal proveedores-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="proveedores-modal-header">
          <div>
            <h2 className="proveedores-modal-title">{verDetalle.razon_social}</h2>
            <p className="proveedores-modal-subtitulo">Detalle del proveedor</p>
          </div>
          <button className="proveedores-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="proveedores-modal-body proveedores-factura-body">

          <div className="proveedores-factura-seccion">
            <h3 className="proveedores-factura-titulo">Datos de la empresa</h3>
            <DetalleGrid>
              <DetalleItem label="Documento" value={`${verDetalle.tipo_doc} ${verDetalle.numero_doc}`} />
              <DetalleItem label="ID" value={`#${String(verDetalle.id_proveedor).padStart(3, "0")}`} />
              <DetalleItem label="Ciudad" value={verDetalle.ciudad} />
              <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span>} />
              <DetalleItem label="Compras realizadas" value={verDetalle.total_compras ?? 0} />
              <DetalleItem label="Última actualización" value={verDetalle.fecha_actualizacion ? new Date(verDetalle.fecha_actualizacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
              <DetalleItem label="Razón social" value={verDetalle.razon_social} />
              <DetalleItem label="Nombre comercial" value={verDetalle.nombre_comercial} />
            </DetalleGrid>
          </div>

          <div className="proveedores-factura-seccion">
            <h3 className="proveedores-factura-titulo">Contacto</h3>
            <DetalleGrid>
              <DetalleItem label="Persona de contacto" value={verDetalle.nombre_contacto} />
              <DetalleItem label="Celular" value={verDetalle.telefono_celular} />
              <DetalleItem label="Correo" value={verDetalle.email_contacto} />
            </DetalleGrid>
          </div>

        </div>

        <div className="proveedores-modal-footer">
          <button className="proveedores-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
          {tienePerm('Proveedores.editar') && (
            <button className="proveedores-btn-primary" onClick={() => { setVerDetalle(null); abrirEditar(verDetalle); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
