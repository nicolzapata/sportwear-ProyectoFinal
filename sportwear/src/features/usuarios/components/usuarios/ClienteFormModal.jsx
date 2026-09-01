import {
  soloDigitos, maxLongitudDocumento, validarNumeroDocumento, validarTelefono, validarNombre,
  LONGITUD_TELEFONO, MAX_LONGITUD_DIRECCION, MAX_LONGITUD_CONTRASENA,
} from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import {
  errorEmailCliente, revisarContrasenaCliente, revisarConfirmarCliente,
} from "../../utils/usuariosHelpers";

export default function ClienteFormModal({
  editar, setModal, guardandoModal, handleGuardarCliente,
  clienteForm, setClienteForm, erroresCliente, setErroresCliente,
  barrios,
  clienteFormRef, verificarDocumentoDuplicado, verificarEmailDuplicado,
}) {
  return (
    <div className="usuarios-modal-overlay" onClick={() => !guardandoModal && setModal(false)}>
      <div className="usuarios-modal usuarios-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal-header">
          <h2 className="usuarios-modal-title">{editar ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button className="usuarios-modal-close" onClick={() => setModal(false)} disabled={guardandoModal}><IconX /></button>
        </div>

        <div className="usuarios-modal-body usuarios-factura-body">
          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Datos personales</h3>
            <div className="usuarios-form-row">
              <div className="usuarios-form-group"><label className="usuarios-form-label">Tipo documento{editar && <span className="usuarios-campo-bloqueado"> (no editable)</span>}</label><Select className="usuarios-form-select" value={clienteForm.tipo_doc} disabled={!!editar}
                onChange={e => {
                  const tipo_doc = e.target.value;
                  setClienteForm({ ...clienteForm, tipo_doc });
                  if (erroresCliente.documento) {
                    const msg = !clienteForm.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(tipo_doc, clienteForm.documento);
                    setErroresCliente(prev => ({ ...prev, documento: msg }));
                  }
                }}>{["CC", "CE", "TI", "NIT", "Pasaporte"].map(t => <option key={t}>{t}</option>)}</Select></div>
              <div className="usuarios-form-group"><label className="usuarios-form-label">N° documento <span className="usuarios-req">*</span>{editar && <span className="usuarios-campo-bloqueado"> (no editable)</span>}</label><input className={`usuarios-form-input${erroresCliente.documento ? " input-error" : ""}`} placeholder="123456789" value={clienteForm.documento} disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} inputMode={clienteForm.tipo_doc === "Pasaporte" ? "text" : "numeric"} maxLength={maxLongitudDocumento(clienteForm.tipo_doc)}
                onChange={e => {
                  const documento = clienteForm.tipo_doc === "Pasaporte" ? e.target.value : soloDigitos(e.target.value);
                  setClienteForm({ ...clienteForm, documento });
                  if (erroresCliente.documento) {
                    const msg = !documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(clienteForm.tipo_doc, documento);
                    setErroresCliente(prev => ({ ...prev, documento: msg }));
                  }
                }}
                onBlur={() => {
                  const msg = !clienteForm.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(clienteForm.tipo_doc, clienteForm.documento);
                  setErroresCliente(prev => ({ ...prev, documento: msg }));
                  if (!editar && !msg) {
                    const valor = clienteForm.documento.trim();
                    if (valor) verificarDocumentoDuplicado(clienteForm.tipo_doc, valor, setErroresCliente, clienteFormRef);
                  }
                }} />{erroresCliente.documento && <span className="usuarios-form-error">{erroresCliente.documento}</span>}</div>
            </div>
            <div className="usuarios-form-row">
              <div className="usuarios-form-group"><label className="usuarios-form-label">Nombres <span className="usuarios-req">*</span></label><input className={`usuarios-form-input${erroresCliente.nombres ? " input-error" : ""}`} placeholder="Ej: Juan" value={clienteForm.nombres}
                onChange={e => { const nombres = e.target.value; setClienteForm({ ...clienteForm, nombres }); if (erroresCliente.nombres) setErroresCliente(prev => ({ ...prev, nombres: validarNombre(nombres) })); }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, nombres: validarNombre(clienteForm.nombres) }))} />{erroresCliente.nombres && <span className="usuarios-form-error">{erroresCliente.nombres}</span>}</div>
              <div className="usuarios-form-group"><label className="usuarios-form-label">Apellidos <span className="usuarios-req">*</span></label><input className={`usuarios-form-input${erroresCliente.apellidos ? " input-error" : ""}`} placeholder="Ej: Pérez" value={clienteForm.apellidos}
                onChange={e => { const apellidos = e.target.value; setClienteForm({ ...clienteForm, apellidos }); if (erroresCliente.apellidos) setErroresCliente(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") })); }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, apellidos: validarNombre(clienteForm.apellidos, "El apellido es obligatorio") }))} />{erroresCliente.apellidos && <span className="usuarios-form-error">{erroresCliente.apellidos}</span>}</div>
            </div>
            <div className="usuarios-form-group"><label className="usuarios-form-label">Teléfono <span className="usuarios-req">*</span></label><input className={`usuarios-form-input${erroresCliente.telefono ? " input-error" : ""}`} placeholder="3001234567" value={clienteForm.telefono} inputMode="numeric" maxLength={LONGITUD_TELEFONO}
              onChange={e => { const telefono = soloDigitos(e.target.value); setClienteForm({ ...clienteForm, telefono }); if (erroresCliente.telefono) setErroresCliente(prev => ({ ...prev, telefono: validarTelefono(telefono) })); }}
              onBlur={() => setErroresCliente(prev => ({ ...prev, telefono: validarTelefono(clienteForm.telefono) }))} />{erroresCliente.telefono && <span className="usuarios-form-error">{erroresCliente.telefono}</span>}</div>
            <div className="usuarios-form-group"><label className="usuarios-form-label">Correo electrónico <span className="usuarios-req">*</span></label><input type="email" className={`usuarios-form-input${erroresCliente.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={clienteForm.email} disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined}
                onChange={e => { const email = e.target.value; setClienteForm({ ...clienteForm, email }); if (erroresCliente.email) setErroresCliente(prev => ({ ...prev, email: errorEmailCliente(email) })); }}
                onBlur={() => {
                  const mensaje = errorEmailCliente(clienteForm.email);
                  setErroresCliente(prev => ({ ...prev, email: mensaje }));
                  if (!editar && !mensaje) {
                    const valor = clienteForm.email.trim();
                    if (valor) verificarEmailDuplicado(valor, setErroresCliente, clienteFormRef);
                  }
                }} />{erroresCliente.email && <span className="usuarios-form-error">{erroresCliente.email}</span>}</div>
          </div>

          <div className="usuarios-factura-seccion">
            <h3 className="usuarios-factura-titulo">Ubicación y clasificación</h3>
            <div className="usuarios-form-group">
              <label className="usuarios-form-label">Ciudad</label>
              <input className="usuarios-form-input" value="Medellín" disabled title="Por ahora solo se hacen envíos a Medellín" />
              <span className="usuarios-form-hint">Por ahora solo se hacen envíos dentro de Medellín.</span>
            </div>
            <div className="usuarios-form-row">
              <div className="usuarios-form-group">
                <label className="usuarios-form-label">Barrio <span className="usuarios-req">*</span></label>
                <Select className={`usuarios-form-select${erroresCliente.id_barrio ? " input-error" : ""}`} value={clienteForm.id_barrio}
                  onChange={e => {
                    const id_barrio = Number(e.target.value);
                    setClienteForm({ ...clienteForm, id_barrio });
                    if (erroresCliente.id_barrio) setErroresCliente(prev => ({ ...prev, id_barrio: id_barrio ? "" : prev.id_barrio }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, id_barrio: clienteForm.id_barrio ? "" : "Selecciona un barrio" }))}>
                  <option value="">— Seleccionar —</option>
                  {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
                </Select>
                {erroresCliente.id_barrio && <span className="usuarios-form-error">{erroresCliente.id_barrio}</span>}
              </div>
              <div className="usuarios-form-group">
                <label className="usuarios-form-label">Dirección completa <span className="usuarios-req">*</span></label>
                <input className={`usuarios-form-input${erroresCliente.direccion ? " input-error" : ""}`} placeholder="Cra 70 # 48-15 Apto 201" maxLength={MAX_LONGITUD_DIRECCION} value={clienteForm.direccion}
                  onChange={e => {
                    const direccion = e.target.value;
                    setClienteForm({ ...clienteForm, direccion });
                    if (erroresCliente.direccion) setErroresCliente(prev => ({ ...prev, direccion: direccion.trim() ? "" : prev.direccion }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, direccion: clienteForm.direccion.trim() ? "" : "La dirección es obligatoria" }))} />
                {erroresCliente.direccion && <span className="usuarios-form-error">{erroresCliente.direccion}</span>}
              </div>
            </div>

            <div className="usuarios-form-row">
              <div className="usuarios-form-group"><label className="usuarios-form-label">Contraseña {!editar && <span className="usuarios-req">*</span>}</label><input type="password" className={`usuarios-form-input${erroresCliente.contrasena ? " input-error" : ""}`} placeholder={editar ? "Dejar vacío para no cambiar" : "Mín. 6 caracteres"} maxLength={MAX_LONGITUD_CONTRASENA} value={clienteForm.contrasena}
                onChange={e => {
                  const contrasena = e.target.value;
                  setClienteForm({ ...clienteForm, contrasena });
                  if (erroresCliente.contrasena) setErroresCliente(prev => ({ ...prev, contrasena: revisarContrasenaCliente(contrasena, editar) }));
                  if (erroresCliente.confirmar) setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(clienteForm.confirmar, contrasena) }));
                }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, contrasena: revisarContrasenaCliente(clienteForm.contrasena, editar) }))} />{erroresCliente.contrasena && <span className="usuarios-form-error">{erroresCliente.contrasena}</span>}</div>
              <div className="usuarios-form-group"><label className="usuarios-form-label">Confirmar contraseña {(!editar || clienteForm.contrasena) && <span className="usuarios-req">*</span>}</label><input type="password" className={`usuarios-form-input${erroresCliente.confirmar ? " input-error" : ""}`} placeholder="Repite la contraseña" maxLength={MAX_LONGITUD_CONTRASENA} value={clienteForm.confirmar}
                onChange={e => {
                  const confirmar = e.target.value;
                  setClienteForm({ ...clienteForm, confirmar });
                  if (erroresCliente.confirmar) setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(confirmar, clienteForm.contrasena) }));
                }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(clienteForm.confirmar, clienteForm.contrasena) }))} />{erroresCliente.confirmar && <span className="usuarios-form-error">{erroresCliente.confirmar}</span>}</div>
            </div>
            {editar ? (
              <div className="usuarios-form-row">
                <div className="usuarios-form-group"><label className="usuarios-form-label">Pago por cuotas</label><Select className="usuarios-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></Select></div>
                <div className="usuarios-form-group"><label className="usuarios-form-label">Estado</label><Select className="usuarios-form-select" value={clienteForm.estado} onChange={e => setClienteForm({ ...clienteForm, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></Select></div>
              </div>
            ) : (
              <div className="usuarios-form-group"><label className="usuarios-form-label">Pago por cuotas</label><Select className="usuarios-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></Select></div>
            )}
          </div>
        </div>

        <div className="usuarios-modal-footer">
          <button className="usuarios-btn-secondary" onClick={() => setModal(false)} disabled={guardandoModal}>Cancelar</button>
          <button className="usuarios-btn-primary" onClick={handleGuardarCliente} disabled={guardandoModal}>
            {guardandoModal ? "Guardando..." : (editar ? "Actualizar" : "Registrar")}
          </button>
        </div>
      </div>
    </div>
  );
}
