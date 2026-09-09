import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconCreditCard, IconHome } from "../../../../shared/components/Icons";

export default function UsuarioDetalleModal({ detalle, setDetalle, tienePerm, usuarioActual, abrirEditar, getRoleName }) {
  if (!detalle) return null;

  const puedeEditar = tienePerm('Usuarios.editar') && detalle.id_usuario !== usuarioActual?.id_usuario;

  const secciones = [
    {
      titulo: "Datos y cuenta",
      icono: <IconCreditCard />,
      campos: [
        { label: "Tipo doc.",          value: detalle.tipo_doc },
        { label: "Documento",          value: detalle.documento },
        { label: "Nombre completo",    value: detalle.nombre, full: true },
        { label: "Correo electrónico", value: detalle.email },
        { label: "Teléfono",           value: detalle.telefono },
      ],
    },
    {
      titulo: "Ubicación y rol",
      icono: <IconHome />,
      campos: [
        { label: "Ciudad",              value: detalle.ciudad },
        { label: "Barrio",              value: detalle.barrio },
        { label: "Dirección",           value: detalle.direccion, full: true },
        { label: "Rol",                 value: detalle.rol || getRoleName(detalle.id_rol) },
        { label: "Estado",              value: detalle.estado },
        { label: "Fecha de creación",   value: detalle.fecha_creacion ? new Date(detalle.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null },
      ],
    },
  ];

  return (
    <DetallePanel
      iniciales={getInitials(detalle.nombre)}
      avatarColor={getAvatarColor(detalle.id_usuario)}
      nombre={detalle.nombre}
      subtitulo="Perfil del usuario"
      secciones={secciones}
      onClose={() => setDetalle(null)}
      onEditar={puedeEditar ? () => { setDetalle(null); abrirEditar(detalle); } : undefined}
      editarLabel="Editar usuario"
    />
  );
}
