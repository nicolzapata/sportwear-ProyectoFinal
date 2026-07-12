// src/pages/clientes/Clientes.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import Toast from "../../components/Toast";
import ExportButtons from "../../components/ExportButtons";
import { soloDigitos } from "../../utils/numerico";
import "./Clientes.css";
import { IconEdit, IconEye, IconSearch, IconX } from "../../components/Icons";

const FORM_VACIO = { nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "", id_barrio: "", direccion: "", tipo_cliente: "Regular", permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo" };
const FILAS_POR_PAGINA = 10;

export default function Clientes() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,        setDatos]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [barrios,      setBarrios]      = useState([]);
  const [zonas,        setZonas]        = useState([]);
  const [barFiltrados, setBarFiltrados] = useState([]);
  const [busqueda,     setBusqueda]     = useState("");
  const [pagina,       setPagina]       = useState(1);
  const [modal,        setModal]        = useState(false);
  const [verDetalle,   setVerDetalle]   = useState(null);
  const [editar,       setEditar]       = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [errores,      setErrores]      = useState({ nombre: "", documento: "" });
  const [toast,        setToast]        = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      api.get("/clientes/con-ventas"),
      api.get("/barrios"),
      api.get("/barrios/zonas")
    ]).then(([clientesRes, barriosRes, zonasRes]) => {
      setDatos(clientesRes.data);
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
    }).catch((err) => {
      setError(err.response?.data?.message || "Error al cargar clientes");
    }).finally(() => setLoading(false));
  }, []);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter(b => b.zona === zona) : barrios);
    setForm(f => ({ ...f, id_barrio: "" }));
  };

  const filtradosAll = datos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.documento?.includes(busqueda)
  );
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);
  const filtrados    = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const abrirRegistrar = () => { setEditar(null); setForm(FORM_VACIO); setBarFiltrados(barrios); setModal(true); };
  const abrirEditar    = (c) => {
    setEditar(c.id_cliente);
    setForm({ nombre: c.nombre, tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", id_barrio: c.id_barrio || "", direccion: c.direccion || "", tipo_cliente: c.tipo_cliente, permiso_pagos: c.permiso_pagos, permiso_cuotas: c.permiso_cuotas || 1, estado: c.estado });
    setBarFiltrados(barrios);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre || !form.documento) return false;
    try {
      if (editar) {
        const { data } = await api.put(`/clientes/${editar}`, form);
        setDatos(prev => prev.map(c => c.id_cliente === editar ? { ...c, ...data } : c));
      } else {
        const { data } = await api.post("/clientes", form);
        setDatos(prev => [...prev, { ...data, barrio_nombre: "", comuna: "", ciudad: "Medellín" }]);
      }
      setModal(false);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar cliente");
      return false;
    }
  };

  const validarPasoDatos = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacion = () => true;

  const validarPasoClasificacion = () => true;

  const toggleEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/clientes/${id}/estado`);
      setDatos(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
    } catch { showToast("error", "Error al cambiar estado"); }
  };

  const tipoBadge = (t) => {
    if (t === "VIP") return "vip";
    if (t === "Mayorista") return "mayorista";
    if (t === "Corporativo") return "corporativo";
    return "";
  };

  const PasoDatos = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className={`ms-form-input${errores.nombre ? " input-error" : ""}`} placeholder="Ej: Juan Pérez" value={form.nombre} onChange={e => { setForm({ ...form, nombre: e.target.value }); if (errores.nombre) setErrores(prev => ({ ...prev, nombre: "" })); }} />{errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}</div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}>{["CC","CE","TI","NIT","Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className={`ms-form-input${errores.documento ? " input-error" : ""}`} placeholder="123456789" value={form.documento} onChange={e => { setForm({ ...form, documento: e.target.value }); if (errores.documento) setErrores(prev => ({ ...prev, documento: "" })); }} />{errores.documento && <span className="ms-form-error">{errores.documento}</span>}</div>
    </div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" inputMode="numeric" placeholder="3001234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: soloDigitos(e.target.value) })} /></div>
      <div className="ms-form-group"><label className="ms-form-label">Correo electrónico</label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
    </div>
  </div>);

  const PasoUbicacion = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} /></div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Zona / Área</label><select className="ms-form-select" onChange={e => handleZona(e.target.value)}><option value="">— Todas las zonas —</option>{zonas.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">Barrio / Comuna</label><select className="ms-form-select" value={form.id_barrio} onChange={e => setForm({ ...form, id_barrio: Number(e.target.value) })}><option value="">— Seleccionar —</option>{barFiltrados.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
    </div>
    <div className="ms-form-group"><label className="ms-form-label">Dirección completa</label><input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
  </div>);

  const PasoClasificacion = (<div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Tipo de cliente</label><select className="ms-form-select" value={form.tipo_cliente} onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}>{["Regular","VIP","Mayorista","Corporativo"].map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">Permiso de pagos</label><select className="ms-form-select" value={form.permiso_pagos} onChange={e => setForm({ ...form, permiso_pagos: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
    </div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={form.permiso_cuotas} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
      <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
    </div>
  </div>);

  const c = verDetalle;
  const DetalleDatos = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="ID"        value={`#${String(c.id_cliente).padStart(3,'0')}`} />
    <DetalleItem label="Nombre"    value={c.nombre} />
    <DetalleItem label="Tipo doc." value={c.tipo_doc} />
    <DetalleItem label="Documento" value={c.documento} />
    <DetalleItem label="Teléfono"  value={c.telefono} />
    <DetalleItem label="Email"     value={c.email} />
  </DetalleGrid></DetalleSeccion>);

  const DetalleUbicacion = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Ciudad"    value={c.ciudad} />
    <DetalleItem label="Barrio"    value={c.barrio_nombre ? `${c.barrio_nombre} (${c.comuna})` : null} />
    <DetalleItem label="Dirección" value={c.direccion} full />
  </DetalleGrid></DetalleSeccion>);

  const DetalleClasificacion = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Tipo cliente" value={c.tipo_cliente} />
    <DetalleItem label="Estado"       value={c.estado} />
  </DetalleGrid></DetalleSeccion>);

  if (error) return <div style={{ padding: 32, color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="clientes-container">
      <div className="clientes-actions-bar">
        <div className="clientes-search-wrapper">
          <span className="clientes-search-icon"><IconSearch /></span>
          <input type="text" className="clientes-search-input" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          {busqueda && <button className="clientes-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
          </div>
          <div className="clientes-actions-right">
            {tienePerm('Clientes.crear') && (
              <button className="clientes-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo cliente</button>
            )}
            <ExportButtons
              datos={filtradosAll}
              columnas={[
                { header: "Cliente", key: "nombre" },
                { header: "Documento", value: (c) => `${c.tipo_doc} ${c.documento}` },
                { header: "Teléfono", value: (c) => c.telefono || "—" },
                { header: "Barrio", value: (c) => (c.barrio_nombre ? `${c.barrio_nombre} (${c.comuna})` : "—") },
                { header: "Tipo", key: "tipo_cliente" },
                { header: "Compras", value: (c) => c.total_compras || 0 },
                { header: "Total gastado", value: (c) => `$${Number(c.total_gastado || 0).toLocaleString("es-CO")}` },
                ...(tienePerm('Clientes.estado') ? [{ header: "Estado", key: "estado" }] : []),
              ]}
              nombreArchivo="clientes"
              titulo="Clientes"
            />
          </div>
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Documento</th>
              <th className="tbl-th">Teléfono</th>
              <th className="tbl-th">Barrio</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Compras</th>
              <th className="tbl-th">Total</th>
              {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {loading ? (
              <tr><td colSpan="9" className="tbl-td">Cargando clientes...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="9" className="tbl-td">No hay clientes con compras registradas</td></tr>
            ) : filtrados.map((c) => (
              <tr key={c.id_cliente} className="tbl-row">
                <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
                <td className="tbl-td"><span className="tabla-doc">{c.tipo_doc} {c.documento}</span></td>
                <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
                <td className="tbl-td">{c.barrio_nombre ? <div><div className="clientes-barrio-name">{c.barrio_nombre}</div><div className="clientes-comuna-name">{c.comuna}</div></div> : <span className="clientes-empty">—</span>}</td>
                <td className="tbl-td"><span className={`tabla-tipo ${tipoBadge(c.tipo_cliente)}`}>{c.tipo_cliente}</span></td>
                <td className="tbl-td">{c.total_compras || 0}</td>
                <td className="tbl-td">${Number(c.total_gastado || 0).toLocaleString('es-CO')}</td>
                {tienePerm('Clientes.estado') && (
                  <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstado} showConfirmation={true} /></td>
                )}
                <td className="tbl-td">
                  <div className="clientes-action-cell">
                    <button className="clientes-action-btn clientes-view-btn" onClick={() => setVerDetalle(c)} title="Ver detalles"><IconEye /></button>
                    {tienePerm('Clientes.editar') && (
                      <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtradosAll.length} registros</span>
          </div>
        )}

        {/* Print button moved to top actions bar */}
      </div>

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          validaciones={[validarPasoDatos, validarPasoUbicacion, validarPasoClasificacion]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasoDatos}
          {PasoUbicacion}
          {PasoClasificacion}
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del cliente"
          subtitulo={verDetalle.nombre}
          badge={<span className={`tabla-status ${verDetalle.estado === "Activo" ? 'activo' : 'inactivo'}`}>{verDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setVerDetalle(null)}
          onEditar={tienePerm('Clientes.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
        >
          {DetalleDatos}
          {DetalleUbicacion}
          {DetalleClasificacion}
        </ModalDetalle>
      )}
      <Toast toast={toast} />
    </div>
  );
}