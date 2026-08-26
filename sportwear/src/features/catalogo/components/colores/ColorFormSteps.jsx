import { getBrightness, MAX_LONGITUD_NOMBRE_COLOR, mensajeErrorNombreColor } from "../../utils/coloresHelpers";

export default function ColorFormSteps({ form, setForm, errores, setErrores }) {
  return (
    <>
      <div>
        <div className="ms-form-group">
          <label className="ms-form-label">Color HEX <span className="ms-req">*</span></label>
          <div className="colores-color-picker-wrapper">
            <input
              type="color"
              className={`colores-color-picker${errores.codigo_hex ? " input-error" : ""}`}
              value={form.codigo_hex}
              onChange={e => {
                setForm({ ...form, codigo_hex: e.target.value });
                if (errores.codigo_hex) setErrores(prev => ({ ...prev, codigo_hex: "" }));
              }}
            />
            <span className="colores-color-value">{form.codigo_hex}</span>
          </div>
          {errores.codigo_hex && <span className="ms-form-error">{errores.codigo_hex}</span>}
        </div>
        <div className="colores-preview" style={{ marginTop: 8 }}>
          <div className="colores-preview-label">Vista previa</div>
          <div className="colores-preview-sample" style={{ backgroundColor: form.codigo_hex }}>
            <span style={{ color: getBrightness(form.codigo_hex) > 128 ? '#000' : '#fff' }}>{form.nombre || 'Color'}</span>
          </div>
        </div>
      </div>
      <div>
        <div className="ms-form-group">
          <label className="ms-form-label">Nombre del color <span className="ms-req">*</span></label>
          <input
            type="text"
            maxLength={MAX_LONGITUD_NOMBRE_COLOR}
            className={`ms-form-input${errores.nombre ? " input-error" : ""}`}
            placeholder="Ej: Rojo Intenso"
            value={form.nombre}
            onChange={e => {
              const nombre = e.target.value;
              setForm({ ...form, nombre });
              if (errores.nombre) setErrores(prev => ({ ...prev, nombre: mensajeErrorNombreColor(nombre) }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, nombre: mensajeErrorNombreColor(form.nombre) }))}
          />
          {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
        </div>
      </div>
    </>
  );
}
