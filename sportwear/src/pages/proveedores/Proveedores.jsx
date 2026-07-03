// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import api from "../../services/api";
import './Proveedores.css';
import { IconEdit, IconEye, IconPrint, IconSearch, IconX } from "../../components/Icons";

const FORM_VACIO = {
  tipo_doc: "NIT",
  numero_doc: "",
  razon_social: "",
  nombres: "",
  apellidos: "",
  nombre_comercial: "",
  nombre_contacto: "",
  cargo_contacto: "",
  telefono_celular: "",
  email_contacto: "",
  ciudad: "",
  departamento: "",
  pais: "Colombia",
  direccion: "",
  estado: "Activo",
};

// tipo_doc → tipo de persona (para inferir el toggle al editar un proveedor existente)
const esEmpresa = (tipo_doc) => tipo_doc === "NIT";

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,      setDatos]      = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando,  setGuardando]  = useState(false);
  const [errorForm,  setErrorForm]  = useState("");

  const [busqueda,   setBusqueda]   = useState("");
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar,     setEditar]     = useState(null);
  const [form,       setForm]       = useState(FORM_VACIO);
  const [tipoPersona, setTipoPersona] = useState("Empresa"); // "Empresa" | "Natural" — solo UI, no se envía al backend
  const [errores,    setErrores]    = useState({});
  const [pagina,     setPagina]     = useState(1);
  const FILAS_POR_PAGINA = 10;

  const [barrios,        setBarrios]        = useState([]);
  const [barrioSel,       setBarrioSel]      = useState("");

  const esMedellin = (ciudad) => {
    const norm = (ciudad || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    return norm === "medellin";
  };

  // Agrupa los barrios por comuna solo para organizar visualmente el <select> (optgroup)
  const barriosPorComuna = barrios.reduce((acc, b) => {
    const clave = b.comuna || "Otros";
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(b);
    return acc;
  }, {});

  useEffect(() => {
    api.get("/barrios").then(({ data }) => setBarrios(data)).catch(() => { /* si falla, el selector de barrio simplemente no aparece */ });
  }, []);

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const { data } = await api.get("/proveedores");
      setDatos(data);
    } catch (err) {
      setErrorCarga(err.response?.data?.message || err.message || "No se pudo cargar la lista de proveedores.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  const filtradosAll = datos.filter(p =>
    p.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre_comercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numero_doc?.includes(busqueda)
  );
  const filtrados    = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);

  const cambiarTipoPersona = (tipo) => {
    setTipoPersona(tipo);
    setForm(prev => ({
      ...prev,
      tipo_doc: tipo === "Empresa" ? "NIT" : "CC",
      nombre_comercial: tipo === "Empresa" ? prev.nombre_comercial : "",
      nombre_contacto: tipo === "Natural" ? prev.razon_social : prev.nombre_contacto,
    }));
    setErrores(prev => ({ ...prev, numero_doc: "", razon_social: "" }));
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setForm(FORM_VACIO);
    setTipoPersona("Empresa");
    setBarrioSel("");
    setErrores({});
    setErrorForm("");
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_proveedor);
    setTipoPersona(esEmpresa(p.tipo_doc) ? "Empresa" : "Natural");
    setBarrioSel("");
    setForm({
      tipo_doc: p.tipo_doc || "NIT",
      numero_doc: p.numero_doc || "",
      razon_social: p.razon_social || "",
      nombres: esEmpresa(p.tipo_doc) ? "" : (p.razon_social || ""),
      apellidos: "",
      nombre_comercial: p.nombre_comercial || "",
      nombre_contacto: p.nombre_contacto || "",
      cargo_contacto: p.cargo_contacto || "",
      telefono_celular: p.telefono_celular || "",
      email_contacto: p.email_contacto || "",
      ciudad: p.ciudad || "",
      departamento: p.departamento || "",
      pais: p.pais || "Colombia",
      direccion: p.direccion || "",
      estado: p.estado || "Activo",
    });
    setErrores({});
    setErrorForm("");
    setModal(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorForm("");
    const payload = { ...form };
    if (barrioSel && !payload.direccion.includes(barrioSel)) {
      payload.direccion = payload.direccion ? `${payload.direccion}, Barrio ${barrioSel}` : `Barrio ${barrioSel}`;
    }
    try {
      if (editar) {
        const { data } = await api.put(`/proveedores/${editar}`, payload);
        setDatos(prev => prev.map(p => p.id_proveedor === editar ? data : p));
      } else {
        const { data } = await api.post("/proveedores", payload);
        setDatos(prev => [data, ...prev]);
      }
      setModal(false);
      return true;
    } catch (err) {
      setErrorForm(err.response?.data?.message || err.message || "No se pudo guardar el proveedor.");
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id) => {
    const anterior = datos;
    try {
      const { data } = await api.patch(`/proveedores/${id}/estado`);
      setDatos(prev => prev.map(p => p.id_proveedor === id ? { ...p, estado: data.estado } : p));
    } catch (err) {
      setDatos(anterior);
      setErrorCarga(err.response?.data?.message || err.message || "No se pudo cambiar el estado.");
    }
  };

  const validarPasoDatos = () => {
    const e = {};
    if (!form.numero_doc.trim()) e.numero_doc = tipoPersona === "Empresa" ? "El NIT es obligatorio" : "El número de documento es obligatorio";
    if (!form.razon_social.trim()) e.razon_social = tipoPersona === "Empresa" ? "La razón social es obligatoria" : "El nombre completo es obligatorio";
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPasoContacto = () => {
    const e = {};
    if (tipoPersona === "Empresa" && !form.nombre_contacto.trim()) e.nombre_contacto = "El nombre de contacto es obligatorio";
    if (form.email_contacto && !/^\S+@\S+\.\S+$/.test(form.email_contacto)) e.email_contacto = "Correo inválido";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const setCampo = (campo, valor) => {
    setForm(prev => {
      const next = { ...prev, [campo]: valor };
      // Si es persona natural, el nombre de contacto es la misma persona: se sincroniza solo
      if (tipoPersona === "Natural" && campo === "razon_social") {
        next.nombre_contacto = valor;
      }
      return next;
    });
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: "" }));
  };

  // Persona natural: nombres y apellidos van en campos separados en la UI,
  // pero se combinan en razon_social (única columna que existe en la BD)
  const setNombreApellido = (campo, valor) => {
    setForm(prev => {
      const nombres   = campo === "nombres"   ? valor : prev.nombres;
      const apellidos = campo === "apellidos" ? valor : prev.apellidos;
      const razonSocial = `${nombres} ${apellidos}`.trim();
      return {
        ...prev,
        [campo]: valor,
        razon_social: razonSocial,
        nombre_contacto: tipoPersona === "Natural" ? razonSocial : prev.nombre_contacto,
      };
    });
    if (errores.razon_social) setErrores(prev => ({ ...prev, razon_social: "" }));
  };

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Tipo de proveedor</label>
        {editar ? (
          <p className="proveedores-tipo-fijo">{tipoPersona === "Empresa" ? "Empresa" : "Persona natural"}</p>
        ) : (
          <div className="proveedores-tipo-toggle">
            <button type="button" className={`proveedores-tipo-btn${tipoPersona === "Empresa" ? " active" : ""}`} onClick={() => cambiarTipoPersona("Empresa")}>Empresa</button>
            <button type="button" className={`proveedores-tipo-btn${tipoPersona === "Natural" ? " active" : ""}`} onClick={() => cambiarTipoPersona("Natural")}>Persona natural</button>
          </div>
        )}
      </div>

      {tipoPersona === "Empresa" ? (
        <>
          <div className="proveedores-form-row">
            <div className="ms-form-group" style={{ flex: 1 }}>
              <label className="ms-form-label">NIT <span className="ms-req">*</span></label>
              <input type="text" className={`ms-form-input${errores.numero_doc ? " input-error" : ""}`} placeholder="Ej: 901123456" value={form.numero_doc} onChange={e => setCampo("numero_doc", e.target.value)} />
              {errores.numero_doc && <span className="ms-form-error">{errores.numero_doc}</span>}
            </div>
            <div className="ms-form-group" style={{ flex: 1 }}>
              <label className="ms-form-label">Nombre comercial</label>
              <input type="text" className="ms-form-input" placeholder="Ej: Textil Express" value={form.nombre_comercial} onChange={e => setCampo("nombre_comercial", e.target.value)} />
            </div>
          </div>
          <div className="ms-form-group">
            <label className="ms-form-label">Razón social <span className="ms-req">*</span></label>
            <input type="text" className={`ms-form-input${errores.razon_social ? " input-error" : ""}`} placeholder="Ej: Distribuidora Textil S.A." value={form.razon_social} onChange={e => setCampo("razon_social", e.target.value)} />
            {errores.razon_social && <span className="ms-form-error">{errores.razon_social}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="proveedores-form-row">
            <div className="ms-form-group" style={{ flex: 1 }}>
              <label className="ms-form-label">Tipo de documento</label>
              <select className="ms-form-select" value={form.tipo_doc} onChange={e => setCampo("tipo_doc", e.target.value)}>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div className="ms-form-group" style={{ flex: 1 }}>
              <label className="ms-form-label">Número de documento <span className="ms-req">*</span></label>
              <input type="text" className={`ms-form-input${errores.numero_doc ? " input-error" : ""}`} placeholder="Ej: 1017123456" value={form.numero_doc} onChange={e => setCampo("numero_doc", e.target.value)} />
              {errores.numero_doc && <span className="ms-form-error">{errores.numero_doc}</span>}
            </div>
          </div>
          <div className="ms-form-group">
            <label className="ms-form-label">Nombres y apellidos completos <span className="ms-req">*</span></label>
            <div className="proveedores-form-row">
              <div className="ms-form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input type="text" className={`ms-form-input${errores.razon_social ? " input-error" : ""}`} placeholder="Nombres" value={form.nombres} onChange={e => setNombreApellido("nombres", e.target.value)} />
              </div>
              <div className="ms-form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input type="text" className={`ms-form-input${errores.razon_social ? " input-error" : ""}`} placeholder="Apellidos" value={form.apellidos} onChange={e => setNombreApellido("apellidos", e.target.value)} />
              </div>
            </div>
            {errores.razon_social && <span className="ms-form-error">{errores.razon_social}</span>}
          </div>
        </>
      )}

      <div className="proveedores-form-row">
        <div className="ms-form-group" style={{ flex: 1 }}>
          <label className="ms-form-label">Ciudad <span className="ms-req">*</span></label>
          <input type="text" className={`ms-form-input${errores.ciudad ? " input-error" : ""}`} placeholder="Ej: Medellín" value={form.ciudad} onChange={e => setCampo("ciudad", e.target.value)} />
          {errores.ciudad && <span className="ms-form-error">{errores.ciudad}</span>}
        </div>
        <div className="ms-form-group" style={{ flex: 1 }}>
          <label className="ms-form-label">Departamento</label>
          <input type="text" className="ms-form-input" placeholder="Ej: Antioquia" value={form.departamento} onChange={e => setCampo("departamento", e.target.value)} />
        </div>
      </div>

      <div className="proveedores-form-row">
        <div className="ms-form-group" style={{ flex: 1 }}>
          <label className="ms-form-label">Dirección</label>
          <input type="text" className="ms-form-input" placeholder="Ej: Cra 50 # 20-30" value={form.direccion} onChange={e => setCampo("direccion", e.target.value)} />
        </div>
        {esMedellin(form.ciudad) && barrios.length > 0 && (
          <div className="ms-form-group" style={{ flex: 1 }}>
            <label className="ms-form-label">Barrio (opcional)</label>
            <select className="ms-form-select" value={barrioSel} onChange={e => setBarrioSel(e.target.value)}>
              <option value="">Selecciona un barrio</option>
              {Object.entries(barriosPorComuna).map(([comuna, lista]) => (
                <optgroup key={comuna} label={comuna}>
                  {lista.map(b => <option key={b.id_barrio} value={b.nombre}>{b.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const PasoContacto = (
    <div>
      {tipoPersona === "Empresa" && (
        <div className="ms-form-group">
          <label className="ms-form-label">Persona de contacto <span className="ms-req">*</span></label>
          <input type="text" className={`ms-form-input${errores.nombre_contacto ? " input-error" : ""}`} placeholder="Ej: María Londoño" value={form.nombre_contacto} onChange={e => setCampo("nombre_contacto", e.target.value)} />
          {errores.nombre_contacto && <span className="ms-form-error">{errores.nombre_contacto}</span>}
        </div>
      )}
      <div className="proveedores-form-row">
        <div className="ms-form-group" style={{ flex: 1 }}>
          <label className="ms-form-label">Cargo</label>
          <input type="text" className="ms-form-input" placeholder="Ej: Gerente comercial" value={form.cargo_contacto} onChange={e => setCampo("cargo_contacto", e.target.value)} />
        </div>
        <div className="ms-form-group" style={{ flex: 1 }}>
          <label className="ms-form-label">Teléfono</label>
          <input type="text" className="ms-form-input" placeholder="Ej: 3001234567" value={form.telefono_celular} onChange={e => setCampo("telefono_celular", e.target.value)} />
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Correo electrónico</label>
        <input type="email" className={`ms-form-input${errores.email_contacto ? " input-error" : ""}`} placeholder="Ej: contacto@empresa.com" value={form.email_contacto} onChange={e => setCampo("email_contacto", e.target.value)} />
        {errores.email_contacto && <span className="ms-form-error">{errores.email_contacto}</span>}
      </div>
      {errorForm && <span className="ms-form-error">{errorForm}</span>}
    </div>
  );

  const pv = verDetalle;
  const pvEsEmpresa = pv && esEmpresa(pv.tipo_doc);

  const DetalleEmpresa = pv && (
    <DetalleSeccion><DetalleGrid>
      <DetalleItem label="Tipo" value={pvEsEmpresa ? "Empresa" : "Persona natural"} />
      <DetalleItem label="Documento" value={`${pv.tipo_doc} ${pv.numero_doc}`} />
      <DetalleItem label={pvEsEmpresa ? "Razón social" : "Nombre completo"} value={pv.razon_social} />
      {pvEsEmpresa && <DetalleItem label="Nombre comercial" value={pv.nombre_comercial || '—'} />}
      <DetalleItem label="Ciudad" value={pv.ciudad} />
      <DetalleItem label="Departamento" value={pv.departamento || '—'} />
      <DetalleItem label="Dirección" value={pv.direccion || '—'} />
      <DetalleItem label="Estado" value={pv.estado} />
    </DetalleGrid></DetalleSeccion>
  );

  const DetalleContacto = pv && (
    <DetalleSeccion><DetalleGrid>
      <DetalleItem label="Contacto" value={pv.nombre_contacto} />
      <DetalleItem label="Cargo" value={pv.cargo_contacto || '—'} />
      <DetalleItem label="Teléfono" value={pv.telefono_celular || '—'} />
      <DetalleItem label="Correo" value={pv.email_contacto || '—'} />
    </DetalleGrid></DetalleSeccion>
  );

  return (
    <div className="proveedores-container">
      <div className="proveedores-actions-bar">
        <div className="proveedores-actions-left">
          <div className="proveedores-search-wrapper">
            <span className="proveedores-search-icon"><IconSearch /></span>
            <input type="text" className="proveedores-search-input" placeholder="Buscar por razón social o documento..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
            {busqueda && <button className="proveedores-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
          </div>
        </div>
        <div className="proveedores-actions-right">
          {tienePerm('Proveedores.crear') && (
            <button className="proveedores-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo proveedor</button>
          )}
          <button className="btn-print" onClick={() => window.print()} title="Imprimir tabla"><IconPrint /></button>
        </div>
      </div>

      {errorCarga && (
        <div className="proveedores-error-banner">
          {errorCarga} <button onClick={cargarProveedores}>Reintentar</button>
        </div>
      )}

      <div className="tbl-container">
        {cargando ? (
          <div className="proveedores-loading">Cargando proveedores...</div>
        ) : (
          <table className="tbl">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th">Empresa</th>
                <th className="tbl-th">Documento</th>
                <th className="tbl-th">Contacto</th>
                <th className="tbl-th">Teléfono</th>
                <th className="tbl-th">Ciudad</th>
                {tienePerm('Proveedores.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filtrados.length === 0 && (
                <tr><td className="tbl-td" colSpan={7}>No hay proveedores para mostrar.</td></tr>
              )}
              {filtrados.map((p) => (
                <tr key={p.id_proveedor} className="tbl-row">
                  <td className="tbl-td">
                    <span className="proveedores-empresa-name">{p.razon_social}</span>
                    {p.nombre_comercial && <div className="proveedores-empresa-sub">{p.nombre_comercial}</div>}
                  </td>
                  <td className="tbl-td"><code className="proveedores-nit-code">{p.tipo_doc} {p.numero_doc}</code></td>
                  <td className="tbl-td proveedores-contacto-cell">{p.nombre_contacto}</td>
                  <td className="tbl-td proveedores-telefono-cell">{p.telefono_celular || '—'}</td>
                  <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad}</span></td>
                  {tienePerm('Proveedores.estado') && (
                    <td className="tbl-td"><StatusToggle id={p.id_proveedor} estado={p.estado} onToggle={() => toggleEstado(p.id_proveedor)} /></td>
                  )}
                  <td className="tbl-td">
                    <div className="proveedores-action-cell">
                      <button className="proveedores-action-btn proveedores-view-btn" onClick={() => setVerDetalle(p)} title="Ver detalles"><IconEye /></button>
                      {tienePerm('Proveedores.editar') && (
                        <button className="proveedores-action-btn proveedores-edit-btn" onClick={() => abrirEditar(p)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!cargando && totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtradosAll.length} registros</span>
          </div>
        )}
      </div>

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar proveedor" : "Nuevo proveedor"}
          pasos={["Datos", "Contacto"]}
          onClose={() => !guardando && setModal(false)}
          onGuardar={guardar}
          validaciones={[validarPasoDatos, validarPasoContacto]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
          guardando={guardando}
        >
          {PasoDatos}{PasoContacto}
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del proveedor" subtitulo={verDetalle.razon_social}
          badge={<span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span>}
          pasos={["Datos", "Contacto"]}
          onClose={() => setVerDetalle(null)}
          onEditar={tienePerm('Proveedores.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
        >
          {DetalleEmpresa}{DetalleContacto}
        </ModalDetalle>
      )}
    </div>
  );
}