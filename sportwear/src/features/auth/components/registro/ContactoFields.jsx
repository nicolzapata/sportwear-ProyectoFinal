import { LONGITUD_TELEFONO } from "../../../../shared/utils/numerico";
import { IconMail, IconPhone, IconLocation } from "./icons";
import Field from "./Field";

export default function ContactoFields({ form, errores, handleChange, onFocus, onBlur, bloqueada }) {
  return (
    <section className={`registro-section${bloqueada ? " registro-section--bloqueada" : ""}`}>
      <header className="registro-section-head">
        <span className="registro-section-num">02</span>
        <span className="registro-section-label">Coordenadas &amp; contacto</span>
        <span className="registro-section-step">{bloqueada ? "Completa el paso anterior" : "Paso 2 de 3"}</span>
      </header>

      <div className="registro-section-body">
        <div className="registro-row">
          <Field icon={<IconMail />} name="email" type="email" label="Correo electrónico"
            placeholder="correo@ejemplo.com" required
            value={form.email} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
            error={errores.email} disabled={bloqueada} />

          <Field icon={<IconPhone />} name="telefono" label="Teléfono móvil" required maxLength={LONGITUD_TELEFONO}
            placeholder="3001234567"
            value={form.telefono} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
            error={errores.telefono} disabled={bloqueada} />
        </div>

        <Field icon={<IconLocation />} name="direccion" label="Dirección de entrega preferencial" required
          placeholder="Cra 43A # 10-20 Apto 301"
          value={form.direccion} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
          error={errores.direccion} disabled={bloqueada} />
      </div>
    </section>
  );
}
