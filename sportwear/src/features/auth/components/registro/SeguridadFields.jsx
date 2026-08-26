import { IconLock, IconEyeOpen, IconEyeClosed } from "./icons";

export default function SeguridadFields({
  form, errores, handleChange, onFocus, onBlur,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
}) {
  return (
    <>
      <h3 className="registro-section-titulo">Seguridad</h3>

      <div className="registro-row">
        <div className="form-group">
          <label><IconLock /> Contraseña <span className="req">*</span></label>
          <div className="input-wrapper">
            <span className="input-icon"><IconLock /></span>
            <input
              type={showPassword ? "text" : "password"}
              name="contrasena"
              placeholder="Mín. 6 caracteres"
              value={form.contrasena}
              onChange={handleChange}
              onFocus={onFocus} onBlur={onBlur}
            />
            <div className="input-bar" />
            <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <IconEyeOpen /> : <IconEyeClosed />}
            </span>
          </div>
          {errores.contrasena && <span className="field-error">{errores.contrasena}</span>}
        </div>
        <div className="form-group">
          <label><IconLock /> Confirmar <span className="req">*</span></label>
          <div className="input-wrapper">
            <span className="input-icon"><IconLock /></span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmar"
              placeholder="Repite tu contraseña"
              value={form.confirmar}
              onChange={handleChange}
              onFocus={onFocus} onBlur={onBlur}
            />
            <div className="input-bar" />
            <span className="input-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <IconEyeOpen /> : <IconEyeClosed />}
            </span>
          </div>
          {errores.confirmar && <span className="field-error">{errores.confirmar}</span>}
        </div>
      </div>
    </>
  );
}
