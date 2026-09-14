import { getInitials } from "../../utils/miCuentaHelpers";
import { IconEdit } from "../../../../shared/components/Icons";

const CAMPOS_PERFIL = [
  { label: "Nombre completo",    key: "nombre"    },
  { label: "Tipo de documento",  key: "tipo_doc"  },
  { label: "N° documento",       key: "documento" },
  { label: "Teléfono móvil",     key: "telefono"  },
  { label: "Correo electrónico", key: "email"     },
  { label: "Ciudad",             key: "ciudad"    },
  { label: "Barrio",             key: "id_barrio" },
  { label: "Dirección de entrega", key: "direccion" },
];

export default function PerfilCard({ perfil, usuario, getBarrioNombre, onEditar }) {
  return (
    <div className="mc-card" style={{ marginBottom: 16 }}>
      {perfil ? (
        <>
          <div className="profile-top-row">
            <div className="profile-avatar">
              <span className="profile-initials">{getInitials(perfil.nombre || usuario?.nombre)}</span>
            </div>
            <div className="profile-right">
              <div className="profile-name-row">
                <p className="profile-name">{perfil.nombre || usuario?.nombre}</p>
                <span className={`badge ${perfil.estado === "Inactivo" ? "error" : "exito"}`}>
                  Cliente {perfil.estado === "Inactivo" ? "inactivo" : "activo"}
                </span>
              </div>
              {perfil.documento && <p className="profile-doc">Documento: {perfil.tipo_doc} {perfil.documento}</p>}
            </div>
            <button className="mc-btn-secondary profile-edit-btn" onClick={onEditar}>
              <IconEdit /> Editar perfil
            </button>
          </div>
          <div className="profile-fields-grid">
            {CAMPOS_PERFIL.map(({ label, key }) => (
              <div key={key} className="profile-field-item">
                <label className="profile-field-label">{label}</label>
                <p className="profile-field-value">
                  {key === "id_barrio"
                    ? getBarrioNombre(perfil[key]) || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>
                    : perfil[key] || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>No se pudo cargar la información del perfil.</p>
      )}
    </div>
  );
}
