import { maxLongitudDocumento } from "../../../../shared/utils/numerico";
import { TIPOS_DOC } from "../../utils/registroHelpers";
import { IconUser } from "./icons";
import Field from "./Field";

export default function DatosPersonalesFields({ form, errores, handleChange, onFocus, onBlur }) {
  return (
    <>
      <h3 className="registro-section-titulo">Datos personales</h3>

      <div className="registro-row">
        <div className="form-group">
          <label>Tipo doc <span className="req">*</span></label>
          <select name="tipo_doc" className="form-control"
            value={form.tipo_doc} onChange={handleChange} onBlur={onBlur}>
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>N° documento <span className="req">*</span></label>
          <div className="input-wrapper">
            <input type="text" name="documento" placeholder="1001234567" inputMode={form.tipo_doc === "PP" ? "text" : "numeric"}
              maxLength={maxLongitudDocumento(form.tipo_doc)}
              value={form.documento} onChange={handleChange}
              onFocus={onFocus} onBlur={onBlur}
              style={{ paddingLeft: "14px" }}/>
            <div className="input-bar" />
          </div>
          {errores.documento && <span className="field-error">{errores.documento}</span>}
        </div>
      </div>

      <div className="registro-row">
        <Field icon={<IconUser />} name="nombres" label="Nombres"
          placeholder="Ana Sofía" required
          value={form.nombres} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
          error={errores.nombres} />

        <Field icon={<IconUser />} name="apellidos" label="Apellidos"
          placeholder="López Ríos" required
          value={form.apellidos} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
          error={errores.apellidos} />
      </div>
    </>
  );
}
