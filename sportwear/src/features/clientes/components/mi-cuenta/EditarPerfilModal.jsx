import { createPortal } from "react-dom";
import { soloDigitos, validarTelefono, validarNombre, LONGITUD_TELEFONO } from "../../../../shared/utils/numerico";
import { errorEmailPerfil } from "../../utils/miCuentaHelpers";
import { IconXModal } from "./miCuentaIcons";

// ── Modal editar perfil — panel único, sin pasos "Siguiente".
// NUEVO: también va por portal, mismo motivo que TodosPedidosModal. ──
export default function EditarPerfilModal({
  form, setForm, errores, setErrores, guardando, onClose, onGuardar,
  zonas, barFiltrados, handleZona, verificarEmailDuplicado,
}) {
  return createPortal(
    <div className="mc-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="mc-modal-box mc-modal-perfil" onClick={(e) => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h2 className="mc-modal-title">Editar perfil</h2>
          <button className="mc-modal-close" onClick={onClose}><IconXModal /></button>
        </div>
        <div className="mc-modal-body">
          <h3 className="mc-modal-section-title">Datos personales</h3>
          <div className="ms-form-row">
            <div className="ms-form-group">
              <label className="ms-form-label">Nombres <span className="ms-req">*</span></label>
              <input
                className={`ms-form-input${errores.nombres ? " input-error" : ""}`}
                placeholder="Ej: Juan"
                value={form.nombres || ""}
                onChange={(e) => {
                  const nombres = e.target.value;
                  setForm({ ...form, nombres });
                  if (errores.nombres) setErrores(prev => ({ ...prev, nombres: validarNombre(nombres) }));
                }}
                onBlur={() => setErrores(prev => ({ ...prev, nombres: validarNombre(form.nombres) }))}
              />
              {errores.nombres && <span className="ms-form-error">{errores.nombres}</span>}
            </div>
            <div className="ms-form-group">
              <label className="ms-form-label">Apellidos <span className="ms-req">*</span></label>
              <input
                className={`ms-form-input${errores.apellidos ? " input-error" : ""}`}
                placeholder="Ej: Pérez"
                value={form.apellidos || ""}
                onChange={(e) => {
                  const apellidos = e.target.value;
                  setForm({ ...form, apellidos });
                  if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") }));
                }}
                onBlur={() => setErrores(prev => ({ ...prev, apellidos: validarNombre(form.apellidos, "El apellido es obligatorio") }))}
              />
              {errores.apellidos && <span className="ms-form-error">{errores.apellidos}</span>}
            </div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group">
              <label className="ms-form-label">Tipo documento</label>
              <select className="ms-form-select" value={form.tipo_doc || "CC"} disabled title="El documento no se puede modificar" onChange={(e) => setForm({ ...form, tipo_doc: e.target.value })}>
                {["CC", "CE", "TI", "NIT", "Pasaporte"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ms-form-group">
              <label className="ms-form-label">N° documento <span className="ms-req">*</span></label>
              <input
                className={`ms-form-input${errores.documento ? " input-error" : ""}`}
                placeholder="123456789"
                value={form.documento || ""}
                disabled
                title="El documento no se puede modificar"
                onChange={(e) => {
                  setForm({ ...form, documento: e.target.value });
                  if (errores.documento) setErrores(prev => ({ ...prev, documento: "" }));
                }}
              />
              {errores.documento && <span className="ms-form-error">{errores.documento}</span>}
            </div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group">
              <label className="ms-form-label">Teléfono <span className="ms-req">*</span></label>
              <input
                className={`ms-form-input${errores.telefono ? " input-error" : ""}`}
                placeholder="3001234567"
                inputMode="numeric"
                maxLength={LONGITUD_TELEFONO}
                value={form.telefono || ""}
                onChange={(e) => {
                  const telefono = soloDigitos(e.target.value);
                  setForm({ ...form, telefono });
                  if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) }));
                }}
                onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))}
              />
              {errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}
            </div>
            <div className="ms-form-group">
              <label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label>
              <input
                type="email"
                className={`ms-form-input${errores.email ? " input-error" : ""}`}
                placeholder="ejemplo@correo.com"
                value={form.email || ""}
                onChange={(e) => {
                  const email = e.target.value;
                  setForm({ ...form, email });
                  if (errores.email) setErrores(prev => ({ ...prev, email: errorEmailPerfil(email) }));
                }}
                onBlur={() => {
                  const mensaje = errorEmailPerfil(form.email);
                  setErrores(prev => ({ ...prev, email: mensaje }));
                  if (!mensaje) {
                    const valor = form.email.trim();
                    if (valor) verificarEmailDuplicado(valor);
                  }
                }}
              />
              {errores.email && <span className="ms-form-error">{errores.email}</span>}
            </div>
          </div>

          <h3 className="mc-modal-section-title" style={{ marginTop: 20 }}>Ubicación</h3>
          <div className="ms-form-group">
            <label className="ms-form-label">Ciudad</label>
            <input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} />
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group">
              <label className="ms-form-label">Zona / Área</label>
              <select className="ms-form-select" onChange={(e) => handleZona(e.target.value)}>
                <option value="">— Todas las zonas —</option>
                {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="ms-form-group">
              <label className="ms-form-label">Barrio</label>
              <select className="ms-form-select" value={form.id_barrio || ""} onChange={(e) => setForm({ ...form, id_barrio: Number(e.target.value) })}>
                <option value="">— Seleccionar —</option>
                {barFiltrados.map((b) => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="ms-form-group">
            <label className="ms-form-label">Dirección completa</label>
            <input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion || ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
        </div>
        <div className="mc-modal-footer">
          <button className="mc-btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={onGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Actualizar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
