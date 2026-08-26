import { LONGITUD_TELEFONO } from "../../../../shared/utils/numerico";
import { IconMail, IconPhone, IconLocation } from "./icons";
import Field from "./Field";

export default function ContactoFields({ form, errores, handleChange, onFocus, onBlur }) {
  return (
    <>
      <h3 className="registro-section-titulo">Datos de contacto</h3>

      <Field icon={<IconMail />} name="email" type="email" label="Correo electrónico"
        placeholder="correo@ejemplo.com" required
        value={form.email} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
        error={errores.email} />

      <Field icon={<IconPhone />} name="telefono" label="Teléfono" required maxLength={LONGITUD_TELEFONO}
        placeholder="3001234567"
        value={form.telefono} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
        error={errores.telefono} />

      <Field icon={<IconLocation />} name="direccion" label="Dirección" required
        placeholder="Cra 43A # 10-20 Apto 301"
        value={form.direccion} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
        error={errores.direccion} />
    </>
  );
}
