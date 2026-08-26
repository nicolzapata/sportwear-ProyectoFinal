import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";

export default function UsuarioDetalleModal({ detalle, setDetalle, tienePerm, usuarioActual, abrirEditar, getRoleName }) {
  if (!detalle) return null;

  return (
    <div className="usuarios-modal-overlay" onClick={() => setDetalle(null)}>
      <div className="usuarios-modal usuarios-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal-header">
          <div>
            <h2 className="usuarios-modal-title">{detalle.nombre}</h2>
            <p className="usuarios-modal-subtitulo">Perfil del usuario</p>
          </div>
          <button className="usuarios-modal-close" onClick={() => setDetalle(null)}><IconX /></button>
        </div>

        <div className="usuarios-modal-body usuarios-factura-body">
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Datos y cuenta</h3>
            <DetalleGrid>
              <DetalleItem label="Tipo doc." value={detalle.tipo_doc} />
              <DetalleItem label="Documento" value={detalle.documento} />
              <DetalleItem label="Nombre completo" value={detalle.nombre} full />
              <DetalleItem label="Correo electrónico" value={detalle.email} />
              <DetalleItem label="Teléfono" value={detalle.telefono} />
            </DetalleGrid>
          </div>
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Ubicación y rol</h3>
            <DetalleGrid>
              <DetalleItem label="Ciudad" value={detalle.ciudad} />
              <DetalleItem label="Barrio" value={detalle.barrio} />
              <DetalleItem label="Dirección" value={detalle.direccion} full />
              <DetalleItem label="Rol" value={detalle.rol || getRoleName(detalle.id_rol)} />
              <DetalleItem label="Estado" value={detalle.estado} />
              <DetalleItem label="Fecha de creación" value={detalle.fecha_creacion ? new Date(detalle.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
            </DetalleGrid>
          </div>
        </div>

        <div className="usuarios-modal-footer">
          <button className="usuarios-btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
          {tienePerm('Usuarios.editar') && detalle.id_usuario !== usuarioActual?.id_usuario && (
            <button className="usuarios-btn-primary" onClick={() => { setDetalle(null); abrirEditar(detalle); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
