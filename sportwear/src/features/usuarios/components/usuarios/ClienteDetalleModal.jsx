import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconCreditCard, IconHome } from "../../../../shared/components/Icons";

export default function ClienteDetalleModal({ clienteDetalle, setClienteDetalle, tienePerm, abrirEditarCliente }) {
  if (!clienteDetalle) return null;

  const secciones = [
    {
      titulo: "Datos y cuenta",
      icono: <IconCreditCard />,
      campos: [
        { label: "Tipo doc.",           value: clienteDetalle.tipo_doc },
        { label: "Documento",           value: clienteDetalle.documento },
        { label: "Nombre completo",     value: clienteDetalle.nombre, full: true },
        { label: "Correo electrónico",  value: clienteDetalle.email },
        { label: "Teléfono móvil",      value: clienteDetalle.telefono },
      ],
    },
    {
      titulo: "Ubicación y despacho",
      icono: <IconHome />,
      campos: [
        { label: "Ciudad",             value: clienteDetalle.ciudad },
        { label: "Barrio",             value: clienteDetalle.barrio_nombre },
        { label: "Dirección de entrega", value: clienteDetalle.direccion, full: true },
        { label: "Pago por cuotas",    value: clienteDetalle.permiso_cuotas ? "Permitido" : "Bloqueado" },
        { label: "Estado",             value: clienteDetalle.estado },
      ],
    },
  ];

  return (
    <DetallePanel
      iniciales={getInitials(clienteDetalle.nombre)}
      avatarColor={getAvatarColor(clienteDetalle.id_cliente)}
      nombre={clienteDetalle.nombre}
      subtitulo="Perfil del cliente"
      secciones={secciones}
      onClose={() => setClienteDetalle(null)}
      onEditar={tienePerm('Clientes.editar') ? () => { setClienteDetalle(null); abrirEditarCliente(clienteDetalle); } : undefined}
      editarLabel="Editar cliente"
    />
  );
}
