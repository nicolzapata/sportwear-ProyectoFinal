import { getInitials } from "../../utils/miCuentaHelpers";

const CAMPOS_PERFIL = [
  { label: "Nombre",    key: "nombre"    },
  { label: "Tipo doc.", key: "tipo_doc"  },
  { label: "Documento", key: "documento" },
  { label: "Teléfono",  key: "telefono"  },
  { label: "Email",     key: "email"     },
  { label: "Ciudad",    key: "ciudad"    },
  { label: "Barrio",    key: "id_barrio" },
  { label: "Dirección", key: "direccion" },
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
              <p className="profile-name">{perfil.nombre || usuario?.nombre}</p>
              {perfil.documento && <p className="profile-doc">CC {perfil.documento}</p>}
              <button className="btn profile-edit-btn" onClick={onEditar}>
                Editar perfil
              </button>
            </div>
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
