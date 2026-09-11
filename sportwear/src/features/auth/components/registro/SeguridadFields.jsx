import { IconLock, IconEyeOpen, IconEyeClosed } from "./icons";

export default function SeguridadFields({
  form, errores, handleChange, onFocus, onBlur,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  bloqueada,
}) {
  const fuerza = !form.contrasena ? 0
    : form.contrasena.length < 6 ? 1
    : /[!*&#@$%._-]/.test(form.contrasena) && form.contrasena.length >= 8 ? 3
    : 2;
  const fuerzaLabel = ["", "Débil", "Intermedia", "Fuerte"][fuerza];

  return (
    <section className={`registro-section${bloqueada ? " registro-section--bloqueada" : ""}`}>
      <header className="registro-section-head">
        <span className="registro-section-num">03</span>
        <span className="registro-section-label">Seguridad de la cuenta</span>
        <span className="registro-section-step">{bloqueada ? "Completa el paso anterior" : "Paso 3 de 3"}</span>
      </header>

      <div className="registro-section-body">
        <div className="registro-row">
          <div className="form-group">
            <label><IconLock /> Contraseña <span className="req">*</span></label>
            <div className={`input-wrapper${errores.contrasena ? " has-error" : ""}`}>
              <span className="input-icon-left"><IconLock /></span>
              <input
                type={showPassword ? "text" : "password"}
                name="contrasena"
                placeholder="Mín. 6 caracteres"
                value={form.contrasena}
                onChange={handleChange}
                onFocus={onFocus} onBlur={onBlur}
                disabled={bloqueada}
              />
              <div className="input-bar" />
              <span className="input-icon-toggle" onClick={() => !bloqueada && setShowPassword(!showPassword)}>
                {showPassword ? <IconEyeOpen /> : <IconEyeClosed />}
              </span>
            </div>
          </div>
          <div className="form-group">
            <label><IconLock /> Confirmar <span className="req">*</span></label>
            <div className={`input-wrapper${errores.confirmar ? " has-error" : ""}`}>
              <span className="input-icon-left"><IconLock /></span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmar"
                placeholder="Repite tu contraseña"
                value={form.confirmar}
                onChange={handleChange}
                onFocus={onFocus} onBlur={onBlur}
                disabled={bloqueada}
              />
              <div className="input-bar" />
              <span className="input-icon-toggle" onClick={() => !bloqueada && setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <IconEyeOpen /> : <IconEyeClosed />}
              </span>
            </div>
          </div>
        </div>

        {form.contrasena && (
          <div className="registro-fuerza">
            <div className="registro-fuerza-head">
              <span>Fuerza de la clave:</span>
              <strong>{fuerzaLabel}</strong>
            </div>
            <div className="registro-fuerza-bar">
              <span className={`registro-fuerza-fill nivel-${fuerza}`} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
