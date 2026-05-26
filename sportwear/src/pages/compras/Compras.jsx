// src/pages/compras/Compras.jsx
import { useState } from "react";
import './Compras.css';
import { IconCart, IconCheck, IconEye, IconHome, IconSearch, IconX } from "../../components/Icons";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";

const fmt = (n) => Number(n||0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const COMPRAS_DEMO = [
  { id_compra: 1, proveedor: "Distribuidora Textil S.A.", producto: "Camiseta Básica", cantidad: 50, total: 1250000, fecha: "2026-03-10T00:00:00", estado: "Recibido" },
  { id_compra: 2, proveedor: "Confecciones del Valle", producto: "Leggins Deportivos", cantidad: 30, total: 900000, fecha: "2026-03-15T00:00:00", estado: "Pendiente" },
  { id_compra: 3, proveedor: "Importaciones Moda & Co.", producto: "Chaqueta Impermeable", cantidad: 20, total: 2400000, fecha: "2026-03-20T00:00:00", estado: "En Tránsito" },
  { id_compra: 4, proveedor: "Accesorios Premium S.A.S.", producto: "Bolso Cuero Sintético", cantidad: 15, total: 1800000, fecha: "2026-03-25T00:00:00", estado: "Pendiente" },
  { id_compra: 5, proveedor: "Telas y Más Ltda.", producto: "Vestido Casual", cantidad: 25, total: 750000, fecha: "2026-03-28T00:00:00", estado: "Anulado" },
];

const PROVEEDORES_DEMO = ["Distribuidora Textil S.A.", "Confecciones del Valle", "Importaciones Moda & Co.", "Accesorios Premium S.A.S.", "Telas y Más Ltda."];
const PRODUCTOS_DEMO = ["Camiseta Básica", "Leggins Deportivos", "Chaqueta Impermeable", "Bolso Cuero Sintético", "Vestido Casual", "Enterizo Floral"];

export default function Compras() {
  const [datos, setDatos] = useState(COMPRAS_DEMO);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [form, setForm] = useState({ proveedor: "", producto: "", cantidad: 1, total: "", estado: "Pendiente", fecha: "" });

  const filtrados = datos.filter(c =>
    c.proveedor?.toLowerCase().includes(busqueda.toLowerCase()) ||
    String(c.id_compra).includes(busqueda)
  );

  const guardar = () => {
    if (!form.proveedor || !form.producto) return;
    const nuevoId = Math.max(...datos.map(c => c.id_compra)) + 1;
    setDatos(prev => [...prev, { ...form, id_compra: nuevoId, cantidad: Number(form.cantidad), total: Number(form.total) }]);
    setModal(false);
  };

  const cambiarEstado = (id, estado) => {
    setDatos(prev => prev.map(c => c.id_compra === id ? { ...c, estado } : c));
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case "Recibido": return "compras-badge-active";
      case "Pendiente": return "compras-badge-pending";
      case "En Tránsito": return "compras-badge-info";
      case "Anulado": return "compras-badge-inactive";
      default: return "compras-badge-info";
    }
  };

  return (
    <div className="compras-container">

      <div className="compras-actions-bar">
        <div className="compras-search-wrapper">
          <span className="compras-search-icon"><IconSearch /></span>
          <input type="text" className="compras-search-input" placeholder="Buscar por proveedor o ID..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="compras-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
        </div>
        <button className="compras-btn-primary" onClick={() => { setForm({ proveedor: "", producto: "", cantidad: 1, total: "", estado: "Pendiente", fecha: "" }); setModal(true); }}>
          <span>+</span> Nueva compra
        </button>
      </div>

      <div className="compras-results-count">
        {filtrados.length} compra{filtrados.length !== 1 ? 's' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Proveedor</th>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Cant.</th>
              <th className="tbl-th">Total</th>
              <th className="tbl-th">Fecha</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((c) => (
              <tr key={c.id_compra} className="tbl-row">
                <td className="tbl-td">
                  <div className="compras-proveedor-cell">
                    <span className="compras-proveedor-name">{c.proveedor}</span>
                  </div>
                </td>
                <td className="tbl-td compras-producto-cell">{c.producto}</td>
                <td className="tbl-td compras-cantidad-cell">{c.cantidad}</td>
                <td className="tbl-td compras-total-cell">{fmt(c.total)}</td>
                <td className="tbl-td compras-fecha-cell">{c.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td">
                  <span className={`compras-badge ${getEstadoBadge(c.estado)}`}>{c.estado}</span>
                </td>
                <td className="tbl-td">
                  <div className="compras-action-cell">
                    <button className="compras-action-btn compras-view-btn" onClick={() => setVerDetalle(c)} title="Ver detalles"><IconEye /></button>
                    {c.estado === "Pendiente" && (
                      <>
                        <button className="compras-action-btn compras-receive-btn" onClick={() => cambiarEstado(c.id_compra, "Recibido")} title="Marcar como recibido"><IconCheck /></button>
                        <button className="compras-action-btn compras-cancel-btn" onClick={() => cambiarEstado(c.id_compra, "Anulado")} title="Anular compra"><IconX /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="compras-modal-overlay" onClick={() => setModal(false)}>
          <div className="compras-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compras-modal-header">
              <h2 className="compras-modal-title">Nueva compra</h2>
              <button className="compras-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>
            <div className="compras-modal-body">
              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Proveedor</label>
                  <select className="compras-form-select" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}>
                    <option value="">Seleccionar proveedor...</option>
                    {PROVEEDORES_DEMO.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">Producto</label>
                  <select className="compras-form-select" value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}>
                    <option value="">Seleccionar producto...</option>
                    {PRODUCTOS_DEMO.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Cantidad</label>
                  <input type="number" min="1" className="compras-form-input" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">Total (COP)</label>
                  <input type="number" className="compras-form-input" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                </div>
              </div>
              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Fecha</label>
                  <input type="date" className="compras-form-input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">Estado</label>
                  <select className="compras-form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Tránsito">En Tránsito</option>
                    <option value="Recibido">Recibido</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="compras-modal-footer">
              <button className="compras-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="compras-btn-primary" onClick={guardar}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle de compra"
          subtitulo={`C-${String(verDetalle.id_compra).padStart(3, "0")}`}
          avatar={<IconCart />}
          badge={<span className={`compras-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>}
          pasos={["Información", "Pago"]}
          onClose={() => setVerDetalle(null)}
        >
          <DetalleSeccion titulo="Información">
            <DetalleGrid>
              <DetalleItem label="ID" value={`C-${String(verDetalle.id_compra).padStart(3, "0")}`} />
              <DetalleItem label="Proveedor" value={verDetalle.proveedor} />
              <DetalleItem label="Producto" value={verDetalle.producto} />
              <DetalleItem label="Cantidad" value={verDetalle.cantidad} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
            </DetalleGrid>
          </DetalleSeccion>
          <DetalleSeccion titulo="Pago">
            <DetalleGrid>
              <DetalleItem label="Total" value={fmt(verDetalle.total)} />
              <DetalleItem label="Estado" value={verDetalle.estado} />
            </DetalleGrid>
          </DetalleSeccion>
        </ModalDetalle>
      )}
    </div>
  );
}