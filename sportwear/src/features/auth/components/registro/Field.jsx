import { CAMPOS_NUMERICOS } from "../../utils/registroHelpers";

// Declarado fuera de Registro: si viviera dentro del componente se recrearía
// en cada render y React remontaría el <input> en cada tecla, perdiendo el foco.
export default function Field({ icon, name, type = "text", placeholder, required, label, value, onChange, onFocus, onBlur, error, maxLength }) {
  return (
    <div className="form-group">
      <label>{icon} {label} {required && <span className="req">*</span>}</label>
      <div className="input-wrapper">
        <span className="input-icon">{icon}</span>
        <input
          type={type} name={name} placeholder={placeholder}
          inputMode={CAMPOS_NUMERICOS.includes(name) ? "numeric" : undefined}
          maxLength={maxLength}
          value={value} onChange={onChange}
          onFocus={onFocus} onBlur={onBlur}
        />
        <div className="input-bar" />
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
