import { soloDigitos, maxLongitudDocumento, validarTelefono, LONGITUD_TELEFONO } from "../../../../shared/utils/numerico";
import Select from "../../../../shared/components/Select";
import { errorNombres, errorApellidos, errorDocumento, errorEmail, errorContrasena, errorConfirmar } from "../../utils/clientesHelpers";

export function PasoDatosCliente({ form, setForm, errores, setErrores, editar, verificarDocumentoDuplicado, verificarEmailDuplicado }) {
  return (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Tipo documento{editar && <span className="ms-campo-bloqueado"> (no editable)</span>}</label><Select className="ms-form-select" value={form.tipo_doc} disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} onChange={e => { const tipo_doc = e.target.value; setForm({ ...form, tipo_doc }); if (errores.documento) setErrores(prev => ({ ...prev, documento: errorDocumento(tipo_doc, form.documento) })); }}>{["CC","CE","TI","NIT","Pasaporte"].map(t => <option key={t}>{t}</option>)}</Select></div>
        <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span>{editar && <span className="ms-campo-bloqueado"> (no editable)</span>}</label><input className={`ms-form-input${errores.documento ? " input-error" : ""}`} placeholder="123456789" inputMode={form.tipo_doc === "Pasaporte" ? "text" : "numeric"} maxLength={maxLongitudDocumento(form.tipo_doc)} value={form.documento} disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} onChange={e => { const documento = form.tipo_doc === "Pasaporte" ? e.target.value : soloDigitos(e.target.value); setForm({ ...form, documento }); if (errores.documento) setErrores(prev => ({ ...prev, documento: errorDocumento(form.tipo_doc, documento) })); }} onBlur={() => {
          const msg = errorDocumento(form.tipo_doc, form.documento);
          setErrores(prev => ({ ...prev, documento: msg }));
          if (!editar && !msg) {
            const valor = form.documento.trim();
            if (valor) verificarDocumentoDuplicado(valor);
          }
        }} />{errores.documento && <span className="ms-form-error">{errores.documento}</span>}</div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Nombres <span className="ms-req">*</span></label><input className={`ms-form-input${errores.nombres ? " input-error" : ""}`} placeholder="Ej: Juan" value={form.nombres} onChange={e => { const nombres = e.target.value; setForm({ ...form, nombres }); if (errores.nombres) setErrores(prev => ({ ...prev, nombres: errorNombres(nombres) })); }} onBlur={() => setErrores(prev => ({ ...prev, nombres: errorNombres(form.nombres) }))} />{errores.nombres && <span className="ms-form-error">{errores.nombres}</span>}</div>
        <div className="ms-form-group"><label className="ms-form-label">Apellidos <span className="ms-req">*</span></label><input className={`ms-form-input${errores.apellidos ? " input-error" : ""}`} placeholder="Ej: Pérez" value={form.apellidos} onChange={e => { const apellidos = e.target.value; setForm({ ...form, apellidos }); if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: errorApellidos(apellidos) })); }} onBlur={() => setErrores(prev => ({ ...prev, apellidos: errorApellidos(form.apellidos) }))} />{errores.apellidos && <span className="ms-form-error">{errores.apellidos}</span>}</div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Teléfono <span className="ms-req">*</span></label><input className={`ms-form-input${errores.telefono ? " input-error" : ""}`} inputMode="numeric" maxLength={LONGITUD_TELEFONO} placeholder="3001234567" value={form.telefono} onChange={e => { const telefono = soloDigitos(e.target.value); setForm({ ...form, telefono }); if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) })); }} onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))} />{errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}</div>
        <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span>{editar && <span className="ms-campo-bloqueado"> (no editable)</span>}</label><input type="email" className={`ms-form-input${errores.email ? " input-error" : ""}`} disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined} placeholder="ejemplo@correo.com" value={form.email} onChange={e => { const email = e.target.value; setForm({ ...form, email }); if (errores.email) setErrores(prev => ({ ...prev, email: errorEmail(email) })); }} onBlur={() => {
          const mensaje = errorEmail(form.email);
          setErrores(prev => ({ ...prev, email: mensaje }));
          if (!editar && !mensaje) {
            const valor = form.email.trim();
            if (valor) verificarEmailDuplicado(valor);
          }
        }} />{errores.email && <span className="ms-form-error">{errores.email}</span>}</div>
      </div>
    </div>
  );
}

export function PasoUbicacionCliente({ form, setForm, zonas, barFiltrados, handleZona }) {
  return (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Ciudad</label>
          <input className="ms-form-input" value="Medellín" disabled title="Por ahora solo se hacen envíos a Medellín" />
          <span className="ms-form-hint">Por ahora solo se hacen envíos dentro de Medellín.</span>
        </div>
        <div className="ms-form-group"><label className="ms-form-label">Zona / Área</label><Select className="ms-form-select" onChange={e => handleZona(e.target.value)}><option value="">— Todas las zonas —</option>{zonas.map(z => <option key={z} value={z}>{z}</option>)}</Select></div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Barrio</label><Select className="ms-form-select" value={form.id_barrio} onChange={e => setForm({ ...form, id_barrio: Number(e.target.value) })}><option value="">— Seleccionar —</option>{barFiltrados.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} ({b.zona})</option>)}</Select></div>
        <div className="ms-form-group"><label className="ms-form-label">Dirección completa</label><input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
      </div>
    </div>
  );
}

export function PasoClasificacionCliente({ form, setForm, errores, setErrores, editar }) {
  return (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label><input type="password" className={`ms-form-input${errores.contrasena ? " input-error" : ""}`} placeholder={editar ? "Dejar vacío para no cambiar" : "Mín. 6 caracteres"} value={form.contrasena} onChange={e => { const contrasena = e.target.value; setForm({ ...form, contrasena }); if (errores.contrasena) setErrores(prev => ({ ...prev, contrasena: errorContrasena(contrasena, editar) })); if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: errorConfirmar(form.confirmar, contrasena) })); }} onBlur={() => setErrores(prev => ({ ...prev, contrasena: errorContrasena(form.contrasena, editar) }))} />{errores.contrasena && <span className="ms-form-error">{errores.contrasena}</span>}</div>
        <div className="ms-form-group"><label className="ms-form-label">Confirmar contraseña {(!editar || form.contrasena) && <span className="ms-req">*</span>}</label><input type="password" className={`ms-form-input${errores.confirmar ? " input-error" : ""}`} placeholder="Repite la contraseña" value={form.confirmar} onChange={e => { const confirmar = e.target.value; setForm({ ...form, confirmar }); if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: errorConfirmar(confirmar, form.contrasena) })); }} onBlur={() => setErrores(prev => ({ ...prev, confirmar: errorConfirmar(form.confirmar, form.contrasena) }))} />{errores.confirmar && <span className="ms-form-error">{errores.confirmar}</span>}</div>
      </div>
      {editar ? (
        <div className="ms-form-row">
          <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><Select className="ms-form-select" value={form.permiso_cuotas} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></Select></div>
          <div className="ms-form-group"><label className="ms-form-label">Estado</label><Select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></Select></div>
        </div>
      ) : (
        <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><Select className="ms-form-select" value={form.permiso_cuotas} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></Select></div>
      )}
    </div>
  );
}
