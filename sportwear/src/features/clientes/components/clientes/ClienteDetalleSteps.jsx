import { DetalleItem, DetalleGrid, DetalleSeccion } from "../../../../shared/components/ModalDetalle";

export function DetalleDatosCliente({ c }) {
  return (
    <DetalleSeccion><DetalleGrid>
      <DetalleItem label="ID"        value={`#${String(c.id_cliente).padStart(3,'0')}`} />
      <DetalleItem label="Nombre"    value={c.nombre} />
      <DetalleItem label="Tipo doc." value={c.tipo_doc} />
      <DetalleItem label="Documento" value={c.documento} />
      <DetalleItem label="Teléfono"  value={c.telefono} />
      <DetalleItem label="Email"     value={c.email} />
    </DetalleGrid></DetalleSeccion>
  );
}

export function DetalleUbicacionCliente({ c }) {
  return (
    <DetalleSeccion><DetalleGrid>
      <DetalleItem label="Ciudad"    value={c.ciudad} />
      <DetalleItem label="Barrio"    value={c.barrio_nombre ? `${c.barrio_nombre} (${c.zona})` : null} />
      <DetalleItem label="Dirección" value={c.direccion} full />
    </DetalleGrid></DetalleSeccion>
  );
}

export function DetalleClasificacionCliente({ c }) {
  return (
    <DetalleSeccion><DetalleGrid>
      <DetalleItem label="Estado" value={c.estado} />
    </DetalleGrid></DetalleSeccion>
  );
}
