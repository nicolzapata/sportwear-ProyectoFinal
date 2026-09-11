import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";

// Panel acoplado a la tabla (igual criterio que UsuarioDetalleModal) — "Ver
// detalles" en modo tabla ya no abre un modal centrado, se ve como en Usuarios.
export default function ProveedorDetalleModal({ verDetalle, setVerDetalle, tienePerm, abrirEditar }) {
  if (!verDetalle) return null;

  const secciones = [
    {
      titulo: "Datos de la empresa",
      campos: [
        { label: "Documento", value: `${verDetalle.tipo_doc} ${verDetalle.numero_doc}` },
        { label: "ID", value: `#${String(verDetalle.id_proveedor).padStart(3, "0")}` },
        { label: "Ciudad", value: verDetalle.ciudad },
        { label: "Estado", value: <span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span> },
        { label: "Compras realizadas", value: verDetalle.total_compras ?? 0 },
        { label: "Última actualización", value: verDetalle.fecha_actualizacion ? new Date(verDetalle.fecha_actualizacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null },
        { label: "Razón social", value: verDetalle.razon_social, full: true },
        { label: "Nombre comercial", value: verDetalle.nombre_comercial },
      ],
    },
    {
      titulo: "Contacto",
      campos: [
        { label: "Persona de contacto", value: verDetalle.nombre_contacto },
        { label: "Cargo", value: verDetalle.cargo_contacto },
        { label: "Celular", value: verDetalle.telefono_celular },
        { label: "Correo", value: verDetalle.email_contacto },
        { label: "Dirección", value: verDetalle.direccion },
      ],
    },
  ];

  return (
    <DetallePanel
      iniciales={getInitials(verDetalle.nombre_comercial || verDetalle.razon_social)}
      avatarColor={getAvatarColor(verDetalle.id_proveedor)}
      nombre={verDetalle.razon_social}
      subtitulo="Detalle del proveedor"
      secciones={secciones}
      onClose={() => setVerDetalle(null)}
      onEditar={tienePerm('Proveedores.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
      editarLabel="Editar proveedor"
    />
  );
}
