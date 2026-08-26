import { soloDigitos, maxLongitudDocumento, validarTelefono, LONGITUD_TELEFONO, MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";
import {
  TIPOS_DOC_POR_PERSONA,
  validarCampoNumeroDoc, validarCampoRazonSocial, validarCampoNombresContacto,
  validarCampoApellidosContacto, validarCampoCiudad, validarCampoDireccion, validarCampoEmail,
} from "../../utils/proveedoresHelpers";

export default function ProveedorFormModal({
  editar, form, setForm, errores, setErrores, guardando,
  setModal, pedirConfirmacion,
}) {
  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: "" }));
  };

  return (
    <div className="proveedores-modal-overlay" onClick={() => !guardando && setModal(false)}>
      <div className="proveedores-modal proveedores-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="proveedores-modal-header">
          <h2 className="proveedores-modal-title">{editar ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <button className="proveedores-modal-close" onClick={() => setModal(false)}><IconX /></button>
        </div>

        <div className="proveedores-modal-body proveedores-factura-body">

          <div className="proveedores-factura-seccion">
            <h3 className="proveedores-factura-titulo">Datos de la empresa</h3>

            <div className="proveedores-form-group">
              <label className="proveedores-form-label">Tipo de proveedor <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
              <select
                className="proveedores-form-select"
                value={form.tipo_persona}
                disabled={!!editar}
                title={editar ? "El tipo de proveedor no se puede modificar" : undefined}
                onChange={(e) => {
                  const tipo_persona = e.target.value;
                  const tipo_doc = TIPOS_DOC_POR_PERSONA[tipo_persona][0];
                  setForm((prev) => ({ ...prev, tipo_persona, tipo_doc }));
                  setErrores((prev) => ({ ...prev, numero_doc: "", razon_social: "" }));
                }}
              >
                <option value="Juridica">Persona Jurídica</option>
                <option value="Natural">Persona Natural</option>
              </select>
            </div>

            <div className="proveedores-form-row-3">
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Tipo de documento <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
                <select
                  className="proveedores-form-select"
                  value={form.tipo_doc}
                  disabled={!!editar}
                  title={editar ? "El documento no se puede modificar" : undefined}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    setForm((prev) => ({ ...prev, tipo_doc: tipo }));
                    // El número de documento depende del tipo (longitud válida por tipo):
                    // si ya había un error visible, se revalida contra el nuevo tipo.
                    if (errores.numero_doc) {
                      setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(tipo, form.numero_doc) }));
                    }
                  }}
                >
                  {TIPOS_DOC_POR_PERSONA[form.tipo_persona].map((t) => (
                    <option key={t} value={t}>{t === "NIT" ? "NIT" : t === "CC" ? "Cédula de ciudadanía" : "Cédula de extranjería"}</option>
                  ))}
                </select>
              </div>
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Número de documento <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`proveedores-form-input${errores.numero_doc ? " input-error" : ""}`}
                  placeholder="Ej: 900123456"
                  maxLength={maxLongitudDocumento(form.tipo_doc)}
                  value={form.numero_doc}
                  disabled={!!editar}
                  title={editar ? "El documento no se puede modificar" : undefined}
                  onChange={(e) => {
                    const valor = soloDigitos(e.target.value);
                    setForm((prev) => ({ ...prev, numero_doc: valor }));
                    if (errores.numero_doc) {
                      setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(form.tipo_doc, valor) }));
                    }
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(form.tipo_doc, form.numero_doc) }))}
                />
                {errores.numero_doc && <span className="proveedores-field-error">{errores.numero_doc}</span>}
              </div>
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Ciudad <span className="proveedores-req">*</span></label>
                <input
                  type="text"
                  className={`proveedores-form-input${errores.ciudad ? " input-error" : ""}`}
                  placeholder="Ej: Medellín"
                  value={form.ciudad}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm((prev) => ({ ...prev, ciudad: valor }));
                    if (errores.ciudad) setErrores((prev) => ({ ...prev, ciudad: validarCampoCiudad(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, ciudad: validarCampoCiudad(form.ciudad) }))}
                />
                {errores.ciudad && <span className="proveedores-field-error">{errores.ciudad}</span>}
              </div>
            </div>

            {form.tipo_persona === "Juridica" && (
              <div className="proveedores-form-row">
                <div className="proveedores-form-group">
                  <label className="proveedores-form-label">Razón social <span className="proveedores-req">*</span></label>
                  <input
                    type="text"
                    maxLength={120}
                    className={`proveedores-form-input${errores.razon_social ? " input-error" : ""}`}
                    placeholder="Ej: Distribuidora Textil S.A."
                    value={form.razon_social}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setForm((prev) => ({ ...prev, razon_social: valor }));
                      if (errores.razon_social) setErrores((prev) => ({ ...prev, razon_social: validarCampoRazonSocial(valor) }));
                    }}
                    onBlur={() => setErrores((prev) => ({ ...prev, razon_social: validarCampoRazonSocial(form.razon_social) }))}
                  />
                  {errores.razon_social && <span className="proveedores-field-error">{errores.razon_social}</span>}
                </div>
                <div className="proveedores-form-group">
                  <label className="proveedores-form-label">Nombre comercial (opcional)</label>
                  <input
                    type="text"
                    maxLength={MAX_LONGITUD_NOMBRE}
                    className="proveedores-form-input"
                    placeholder="Nombre con el que se conoce comercialmente"
                    value={form.nombre_comercial}
                    onChange={(e) => set("nombre_comercial", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="proveedores-form-row">
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Departamento</label>
                <input type="text" maxLength={MAX_LONGITUD_NOMBRE} className="proveedores-form-input" placeholder="Ej: Antioquia" value={form.departamento} onChange={(e) => set("departamento", e.target.value)} />
              </div>
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Dirección <span className="proveedores-req">*</span></label>
                <input
                  type="text"
                  className={`proveedores-form-input${errores.direccion ? " input-error" : ""}`}
                  value={form.direccion}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm((prev) => ({ ...prev, direccion: valor }));
                    if (errores.direccion) setErrores((prev) => ({ ...prev, direccion: validarCampoDireccion(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, direccion: validarCampoDireccion(form.direccion) }))}
                />
                {errores.direccion && <span className="proveedores-field-error">{errores.direccion}</span>}
              </div>
            </div>
          </div>

          <div className="proveedores-factura-seccion">
            <h3 className="proveedores-factura-titulo">{form.tipo_persona === "Natural" ? "Datos del proveedor" : "Contacto"}</h3>

            <div className="proveedores-form-row-3">
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">{form.tipo_persona === "Natural" ? "Nombres" : "Nombres de contacto"} <span className="proveedores-req">*</span></label>
                <input
                  type="text"
                  className={`proveedores-form-input${errores.nombres_contacto ? " input-error" : ""}`}
                  placeholder="Ej: Juan"
                  value={form.nombres_contacto}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm((prev) => ({ ...prev, nombres_contacto: valor }));
                    if (errores.nombres_contacto) setErrores((prev) => ({ ...prev, nombres_contacto: validarCampoNombresContacto(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, nombres_contacto: validarCampoNombresContacto(form.nombres_contacto) }))}
                />
                {errores.nombres_contacto && <span className="proveedores-field-error">{errores.nombres_contacto}</span>}
              </div>
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">{form.tipo_persona === "Natural" ? "Apellidos" : "Apellidos de contacto"} <span className="proveedores-req">*</span></label>
                <input
                  type="text"
                  className={`proveedores-form-input${errores.apellidos_contacto ? " input-error" : ""}`}
                  placeholder="Ej: Pérez"
                  value={form.apellidos_contacto}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm((prev) => ({ ...prev, apellidos_contacto: valor }));
                    if (errores.apellidos_contacto) setErrores((prev) => ({ ...prev, apellidos_contacto: validarCampoApellidosContacto(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, apellidos_contacto: validarCampoApellidosContacto(form.apellidos_contacto) }))}
                />
                {errores.apellidos_contacto && <span className="proveedores-field-error">{errores.apellidos_contacto}</span>}
              </div>
              {form.tipo_persona === "Juridica" && (
                <div className="proveedores-form-group">
                  <label className="proveedores-form-label">Cargo</label>
                  <input type="text" maxLength={MAX_LONGITUD_NOMBRE} className="proveedores-form-input" value={form.cargo_contacto} onChange={(e) => set("cargo_contacto", e.target.value)} />
                </div>
              )}
            </div>

            <div className="proveedores-form-row">
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Teléfono celular <span className="proveedores-req">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`proveedores-form-input${errores.telefono_celular ? " input-error" : ""}`}
                  placeholder="Ej: 3001234567"
                  maxLength={LONGITUD_TELEFONO}
                  value={form.telefono_celular}
                  onChange={(e) => {
                    const valor = soloDigitos(e.target.value);
                    setForm((prev) => ({ ...prev, telefono_celular: valor }));
                    if (errores.telefono_celular) setErrores((prev) => ({ ...prev, telefono_celular: validarTelefono(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, telefono_celular: validarTelefono(form.telefono_celular) }))}
                />
                {errores.telefono_celular && <span className="proveedores-field-error">{errores.telefono_celular}</span>}
              </div>
              <div className="proveedores-form-group">
                <label className="proveedores-form-label">Correo de contacto <span className="proveedores-req">*</span></label>
                <input
                  type="email"
                  className={`proveedores-form-input${errores.email_contacto ? " input-error" : ""}`}
                  placeholder="contacto@empresa.com"
                  value={form.email_contacto}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm((prev) => ({ ...prev, email_contacto: valor }));
                    if (errores.email_contacto) setErrores((prev) => ({ ...prev, email_contacto: validarCampoEmail(valor) }));
                  }}
                  onBlur={() => setErrores((prev) => ({ ...prev, email_contacto: validarCampoEmail(form.email_contacto) }))}
                />
                {errores.email_contacto && <span className="proveedores-field-error">{errores.email_contacto}</span>}
              </div>
            </div>

            <div className="proveedores-form-group">
              <label className="proveedores-form-label">Estado</label>
              <select className="proveedores-form-select" value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="proveedores-modal-footer">
          <button className="proveedores-btn-secondary" onClick={() => setModal(false)} disabled={guardando}>Cancelar</button>
          <button className="proveedores-btn-primary" onClick={pedirConfirmacion} disabled={guardando}>
            {guardando ? "Guardando..." : editar ? "Actualizar" : "Registrar proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}
