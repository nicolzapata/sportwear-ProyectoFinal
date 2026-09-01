import {
  soloDigitos, maxLongitudDocumento, validarNumeroDocumento, validarTelefono, validarNombre,
  LONGITUD_TELEFONO, MAX_LONGITUD_DIRECCION, MAX_LONGITUD_CONTRASENA,
} from "../../../../shared/utils/numerico";
import { IconEyeOpen, IconEyeClosed, IconLock, IconX } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import { TIPOS_DOC, errorEmailUsuario, revisarContrasena, revisarConfirmar } from "../../utils/usuariosHelpers";

export default function UsuarioFormModal({
  editar, setModal, guardandoModal, handleGuardarUsuario,
  form, setForm, errores, setErrores,
  roles, barrios, esRolAdmin,
  showPassword, setShowPassword,
  formRef, verificarDocumentoDuplicado, verificarEmailDuplicado,
}) {
  // ── Sección: Datos personales (documento primero, como en Registro) ───────
  const PasoPersonal = (
    <div>
      <div className="usuarios-form-row">
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Tipo doc. <span className="usuarios-req">*</span>{editar && <span className="usuarios-campo-bloqueado"> (no editable)</span>}</label>
          <Select className="usuarios-form-select" value={form.tipo_doc}
            disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined}
            onChange={e => {
              const tipo_doc = e.target.value;
              setForm({ ...form, tipo_doc });
              if (errores.documento) {
                const msg = !form.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(tipo_doc, form.documento);
                setErrores(prev => ({ ...prev, documento: msg }));
              }
            }}>
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">N° documento <span className="usuarios-req">*</span>{editar && <span className="usuarios-campo-bloqueado"> (no editable)</span>}</label>
          <input className={`usuarios-form-input${errores.documento ? " input-error" : ""}`} placeholder="1001234567" value={form.documento}
            inputMode={form.tipo_doc === "PP" ? "text" : "numeric"}
            maxLength={maxLongitudDocumento(form.tipo_doc)}
            disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined}
            onChange={e => {
              const documento = form.tipo_doc === "PP" ? e.target.value : soloDigitos(e.target.value);
              setForm({ ...form, documento });
              if (errores.documento) {
                const msg = !documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(form.tipo_doc, documento);
                setErrores(prev => ({ ...prev, documento: msg }));
              }
            }}
            onBlur={() => {
              const msg = !form.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(form.tipo_doc, form.documento);
              setErrores(prev => ({ ...prev, documento: msg }));
              if (!editar && !msg) {
                const valor = form.documento.trim();
                if (valor) verificarDocumentoDuplicado(form.tipo_doc, valor, setErrores, formRef);
              }
            }} />
          {errores.documento && <span className="usuarios-form-error">{errores.documento}</span>}
        </div>
      </div>
      <div className="usuarios-form-row">
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Nombres <span className="usuarios-req">*</span></label>
          <input className={`usuarios-form-input${errores.nombres ? " input-error" : ""}`} placeholder="Ej: Nicol" value={form.nombres}
            onChange={e => {
              const nombres = e.target.value;
              setForm({ ...form, nombres });
              if (errores.nombres) setErrores(prev => ({ ...prev, nombres: validarNombre(nombres, "El nombre es obligatorio") }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, nombres: validarNombre(form.nombres, "El nombre es obligatorio") }))} />
          {errores.nombres && <span className="usuarios-form-error">{errores.nombres}</span>}
        </div>
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Apellidos <span className="usuarios-req">*</span></label>
          <input className={`usuarios-form-input${errores.apellidos ? " input-error" : ""}`} placeholder="Ej: Zapata" value={form.apellidos}
            onChange={e => {
              const apellidos = e.target.value;
              setForm({ ...form, apellidos });
              if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, apellidos: validarNombre(form.apellidos, "El apellido es obligatorio") }))} />
          {errores.apellidos && <span className="usuarios-form-error">{errores.apellidos}</span>}
        </div>
      </div>
    </div>
  );

  // ── Sección: Datos de contacto ─────────────────────────────────────────────
  const PasoContacto = (
    <div>
      <div className="usuarios-form-row">
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Correo electrónico <span className="usuarios-req">*</span>{editar && <span className="usuarios-campo-bloqueado"> (no editable)</span>}</label>
          <input type="email" className={`usuarios-form-input${errores.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={form.email}
            disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined}
            onChange={e => {
              const email = e.target.value;
              setForm({ ...form, email });
              if (errores.email) setErrores(prev => ({ ...prev, email: errorEmailUsuario(email) }));
            }}
            onBlur={() => {
              const mensaje = errorEmailUsuario(form.email);
              setErrores(prev => ({ ...prev, email: mensaje }));
              if (!editar && !mensaje) {
                const valor = form.email.trim();
                if (valor) verificarEmailDuplicado(valor, setErrores, formRef);
              }
            }} />
          {errores.email && <span className="usuarios-form-error">{errores.email}</span>}
        </div>
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Teléfono <span className="usuarios-req">*</span></label>
          <input className={`usuarios-form-input${errores.telefono ? " input-error" : ""}`} placeholder="3001234567" value={form.telefono} inputMode="numeric" maxLength={LONGITUD_TELEFONO}
            onChange={e => {
              const telefono = soloDigitos(e.target.value);
              setForm({ ...form, telefono });
              if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))} />
          {errores.telefono && <span className="usuarios-form-error">{errores.telefono}</span>}
        </div>
      </div>
      <div className="usuarios-form-group">
        <label className="usuarios-form-label">Ciudad</label>
        <input className="usuarios-form-input" value="Medellín" disabled title="Por ahora solo se hacen envíos a Medellín" />
        <span className="usuarios-form-hint">Por ahora solo se hacen envíos dentro de Medellín.</span>
      </div>
      <div className="usuarios-form-row">
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Barrio <span className="usuarios-req">*</span></label>
          <Select className={`usuarios-form-select${errores.id_barrio ? " input-error" : ""}`} value={form.id_barrio}
            onChange={e => {
              const id_barrio = e.target.value;
              setForm({ ...form, id_barrio });
              if (errores.id_barrio) setErrores(prev => ({ ...prev, id_barrio: id_barrio ? "" : prev.id_barrio }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, id_barrio: form.id_barrio ? "" : "Selecciona un barrio" }))}>
            <option value="">— Selecciona un barrio —</option>
            {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
          </Select>
          {errores.id_barrio && <span className="usuarios-form-error">{errores.id_barrio}</span>}
        </div>
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Dirección <span className="usuarios-req">*</span></label>
          <input className={`usuarios-form-input${errores.direccion ? " input-error" : ""}`} placeholder="Cra 43A # 10-20 Apto 301" maxLength={MAX_LONGITUD_DIRECCION} value={form.direccion}
            onChange={e => {
              const direccion = e.target.value;
              setForm({ ...form, direccion });
              if (errores.direccion) setErrores(prev => ({ ...prev, direccion: direccion.trim() ? "" : prev.direccion }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, direccion: form.direccion.trim() ? "" : "La dirección es obligatoria" }))} />
          {errores.direccion && <span className="usuarios-form-error">{errores.direccion}</span>}
        </div>
      </div>
    </div>
  );

  // ── Sección: Seguridad (solo al crear) ─────────────────────────────────────
  const PasoSeguridad = !editar && (
    <div className="usuarios-form-row">
      <div className="usuarios-form-group">
        <label className="usuarios-form-label">Contraseña <span className="usuarios-req">*</span></label>
        <div className="input-wrapper">
          <span className="input-icon"><IconLock /></span>
          <input type={showPassword ? "text" : "password"}
            className={`usuarios-form-input${errores.contrasena ? " input-error" : ""}`}
            placeholder="Mínimo 6 caracteres"
            maxLength={MAX_LONGITUD_CONTRASENA}
            value={form.contrasena}
            onChange={e => {
              const contrasena = e.target.value;
              setForm({ ...form, contrasena });
              if (errores.contrasena) setErrores(prev => ({ ...prev, contrasena: revisarContrasena(contrasena, editar) }));
              if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(form.confirmar, contrasena) }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, contrasena: revisarContrasena(form.contrasena, editar) }))} />
          <div className="input-bar" />
          <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IconEyeOpen /> : <IconEyeClosed />}</span>
        </div>
        {errores.contrasena && <span className="usuarios-form-error">{errores.contrasena}</span>}
      </div>
      <div className="usuarios-form-group">
        <label className="usuarios-form-label">Confirmar contraseña <span className="usuarios-req">*</span></label>
        <input type="password"
          className={`usuarios-form-input${errores.confirmar ? " input-error" : ""}`}
          placeholder="Repite la contraseña"
          maxLength={MAX_LONGITUD_CONTRASENA}
          value={form.confirmar}
          onChange={e => {
            const confirmar = e.target.value;
            setForm({ ...form, confirmar });
            if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(confirmar, form.contrasena) }));
          }}
          onBlur={() => setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(form.confirmar, form.contrasena) }))} />
        {errores.confirmar && <span className="usuarios-form-error">{errores.confirmar}</span>}
      </div>
    </div>
  );

  // ── Sección: Rol y estado (solo administración) ────────────────────────────
  const PasoRolEstado = (
    editar ? (
      <div className="usuarios-form-row">
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Rol</label>
          <Select className="usuarios-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
            {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
          </Select>
        </div>
        <div className="usuarios-form-group">
          <label className="usuarios-form-label">Estado</label>
          <Select
            className="usuarios-form-select"
            value={esRolAdmin(form.id_rol) ? "Activo" : form.estado}
            disabled={esRolAdmin(form.id_rol)}
            title={esRolAdmin(form.id_rol) ? "Un administrador siempre permanece activo" : undefined}
            onChange={e => setForm({ ...form, estado: e.target.value })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </Select>
        </div>
      </div>
    ) : (
      <div className="usuarios-form-group">
        <label className="usuarios-form-label">Rol</label>
        <Select className="usuarios-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
          {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
        </Select>
      </div>
    )
  );

  return (
    <div className="usuarios-modal-overlay" onClick={() => !guardandoModal && setModal(false)}>
      <div className="usuarios-modal usuarios-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal-header">
          <h2 className="usuarios-modal-title">{editar ? "Editar usuario" : "Nuevo usuario"}</h2>
          <button className="usuarios-modal-close" onClick={() => setModal(false)} disabled={guardandoModal}><IconX /></button>
        </div>

        <div className="usuarios-modal-body usuarios-factura-body">
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Datos personales</h3>
            {PasoPersonal}
          </div>
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Datos de contacto</h3>
            {PasoContacto}
          </div>
          {PasoSeguridad && (
            <div className="usuarios-factura-seccion">
              <h3 className="usuarios-factura-titulo">Seguridad</h3>
              {PasoSeguridad}
            </div>
          )}
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Rol y estado</h3>
            {PasoRolEstado}
          </div>
        </div>

        <div className="usuarios-modal-footer">
          <button className="usuarios-btn-secondary" onClick={() => setModal(false)} disabled={guardandoModal}>Cancelar</button>
          <button className="usuarios-btn-primary" onClick={handleGuardarUsuario} disabled={guardandoModal}>
            {guardandoModal ? "Guardando..." : (editar ? "Actualizar" : "Registrar")}
          </button>
        </div>
      </div>
    </div>
  );
}
