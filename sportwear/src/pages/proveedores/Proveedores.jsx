// src/pages/proveedores/Proveedores.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import './Proveedores.css';
import { IconEdit, IconEye, IconPrint, IconSearch, IconX } from "../../components/Icons";

const PROVEEDORES_DEMO = [
  { id_proveedor: 1, nombre: "Distribuidora Textil S.A.", nit: "900.123.456-7", contacto: "María Londoño", telefono: "3001234567", ciudad: "Medellín", estado: "Activo" },
  { id_proveedor: 2, nombre: "Confecciones del Valle", nit: "800.987.654-3", contacto: "Jorge Bermúdez", telefono: "3119876543", ciudad: "Cali", estado: "Activo" },
  { id_proveedor: 3, nombre: "Importaciones Moda & Co.", nit: "901.456.789-1", contacto: "Paola Ríos", telefono: "3204567890", ciudad: "Bogotá", estado: "Activo" },
  { id_proveedor: 4, nombre: "Telas y Más Ltda.", nit: "700.321.654-9", contacto: "Andrés Cano", telefono: "3153216549", ciudad: "Pereira", estado: "Inactivo" },
  { id_proveedor: 5, nombre: "Accesorios Premium S.A.S.", nit: "901.789.123-4", contacto: "Luisa Mora", telefono: "3007891234", ciudad: "Medellín", estado: "Activo" },
];

const FORM_VACIO = { nombre: "", nit: "", contacto: "", telefono: "", ciudad: "", estado: "Activo" };

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,      setDatos]      = useState(PROVEEDORES_DEMO);
  const [busqueda,   setBusqueda]   = useState("");
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar,     setEditar]     = useState(null);
  const [form,       setForm]       = useState(FORM_VACIO);
  const [pagina,     setPagina]     = useState(1);
  const FILAS_POR_PAGINA = 10;

  const filtradosAll = datos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.nit?.includes(busqueda));
  const filtrados    = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);

  const abrirRegistrar = () => { setEditar(null); setForm(FORM_VACIO); setModal(true); };
  const abrirEditar    = (p) => { setEditar(p.id_proveedor); setForm({ nombre: p.nombre, nit: p.nit, contacto: p.contacto, telefono: p.telefono, ciudad: p.ciudad, estado: p.estado }); setModal(true); };
  const guardar        = () => { if (!form.nombre || !form.nit) return; if (editar) { setDatos(prev => prev.map(p => p.id_proveedor === editar ? { ...p, ...form } : p)); } else { const nuevoId = Math.max(...datos.map(p => p.id_proveedor)) + 1; setDatos(prev => [...prev, { ...form, id_proveedor: nuevoId }]); } setModal(false); };
  const toggleEstado   = async (id, nuevoEstado) => { setDatos(prev => prev.map(p => p.id_proveedor === id ? { ...p, estado: nuevoEstado } : p)); };

  const PasoEmpresa  = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Nombre empresa <span className="ms-req">*</span></label><input type="text" className="ms-form-input" placeholder="Ej: Distribuidora ABC" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">NIT <span className="ms-req">*</span></label><input type="text" className="ms-form-input" placeholder="Ej: 901.123.456-7" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input type="text" className="ms-form-input" placeholder="Ej: Medellín" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></div>
  </div>);

  const PasoContacto = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Persona de contacto</label><input type="text" className="ms-form-input" placeholder="Ej: Juan Pérez" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input type="text" className="ms-form-input" placeholder="Ej: 3001234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
  </div>);

  const pv = verDetalle;
  const DetalleEmpresa  = pv && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="ID"      value={`#${String(pv.id_proveedor).padStart(3,'0')}`} />
    <DetalleItem label="Empresa" value={pv.nombre} />
    <DetalleItem label="NIT"     value={pv.nit} />
    <DetalleItem label="Ciudad"  value={pv.ciudad} />
    <DetalleItem label="Estado"  value={pv.estado} />
  </DetalleGrid></DetalleSeccion>);

  const DetalleContacto = pv && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Persona de contacto" value={pv.contacto} />
    <DetalleItem label="Teléfono"            value={pv.telefono} />
  </DetalleGrid></DetalleSeccion>);

  return (
    <div className="proveedores-container">
      <div className="proveedores-actions-bar">
        <div className="proveedores-search-wrapper">
          <span className="proveedores-search-icon"><IconSearch /></span>
          <input type="text" className="proveedores-search-input" placeholder="Buscar proveedor o NIT..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          {busqueda && <button className="proveedores-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
        </div>
        {tienePerm('Proveedores.crear') && (
          <button className="proveedores-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo proveedor</button>
        )}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Empresa</th>
              <th className="tbl-th">NIT</th>
              <th className="tbl-th">Contacto</th>
              <th className="tbl-th">Teléfono</th>
              <th className="tbl-th">Ciudad</th>
              {tienePerm('Proveedores.estado') && <th className="tbl-th">Estado</th>}
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((p) => (
              <tr key={p.id_proveedor} className="tbl-row">
                <td className="tbl-td"><span className="proveedores-empresa-name">{p.nombre}</span></td>
                <td className="tbl-td"><code className="proveedores-nit-code">{p.nit}</code></td>
                <td className="tbl-td proveedores-contacto-cell">{p.contacto}</td>
                <td className="tbl-td proveedores-telefono-cell">{p.telefono}</td>
                <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad}</span></td>
                {tienePerm('Proveedores.estado') && (
                  <td className="tbl-td"><StatusToggle id={p.id_proveedor} estado={p.estado} onToggle={toggleEstado} /></td>
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
        <div className="print-button-container">
          <button className="btn-print" onClick={() => window.print()}><IconPrint /></button>
        </div>
      </div>

      {modal && (
        <ModalSteps titulo={editar ? "Editar proveedor" : "Nuevo proveedor"} pasos={["Datos empresa","Contacto"]} onClose={() => setModal(false)} onGuardar={guardar} labelGuardar={editar ? "Actualizar" : "Registrar"}>
          {PasoEmpresa}{PasoContacto}
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del proveedor" subtitulo={verDetalle.nombre}
          badge={<span className={`tabla-status${verDetalle.estado==="Activo"?' activo':' inactivo'}`}>{verDetalle.estado}</span>}
          pasos={["Datos empresa", "Contacto"]}
          onClose={() => setVerDetalle(null)}
          onEditar={tienePerm('Proveedores.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
        >
          {DetalleEmpresa}{DetalleContacto}
        </ModalDetalle>
      )}
    </div>
  );
}