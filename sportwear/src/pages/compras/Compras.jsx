// src/pages/compras/Compras.jsx
import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import './Compras.css';
import { IconCart, IconEye, IconPrint, IconSearch, IconX } from "../../components/Icons";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";

const fmt = (n) => Number(n||0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const FILAS_POR_PAGINA = 10;

const COMPRAS_DEMO = [
  { id_compra: 1, proveedor: "Distribuidora Textil S.A.", producto: "Camiseta Básica", cantidad: 50, total: 1250000, fecha: "2026-03-10T00:00:00", estado: "Recibido" },
  { id_compra: 2, proveedor: "Confecciones del Valle", producto: "Leggins Deportivos", cantidad: 30, total: 900000, fecha: "2026-03-15T00:00:00", estado: "Pendiente" },
  { id_compra: 3, proveedor: "Importaciones Moda & Co.", producto: "Chaqueta Impermeable", cantidad: 20, total: 2400000, fecha: "2026-03-20T00:00:00", estado: "En Tránsito" },
  { id_compra: 4, proveedor: "Accesorios Premium S.A.S.", producto: "Bolso Cuero Sintético", cantidad: 15, total: 1800000, fecha: "2026-03-25T00:00:00", estado: "Pendiente" },
  { id_compra: 5, proveedor: "Telas y Más Ltda.", producto: "Vestido Casual", cantidad: 25, total: 750000, fecha: "2026-03-28T00:00:00", estado: "Anulado" },
];
const PROVEEDORES_DEMO = ["Distribuidora Textil S.A.", "Confecciones del Valle", "Importaciones Moda & Co.", "Accesorios Premium S.A.S.", "Telas y Más Ltda."];
const PRODUCTOS_DEMO   = ["Camiseta Básica", "Leggins Deportivos", "Chaqueta Impermeable", "Bolso Cuero Sintético", "Vestido Casual", "Enterizo Floral"];

export default function Compras() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,      setDatos]      = useState(COMPRAS_DEMO);
  const [busqueda,   setBusqueda]   = useState("");
  const [pagina,     setPagina]     = useState(1);
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [form,       setForm]       = useState({ proveedor: "", producto: "", cantidad: 1, total: "", estado: "Pendiente", fecha: "" });

  const filtradosAll = datos.filter(c => c.proveedor?.toLowerCase().includes(busqueda.toLowerCase()) || String(c.id_compra).includes(busqueda));
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);
  const filtrados    = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const guardar = () => {
    if (!form.proveedor || !form.producto) return;
    const nuevoId = Math.max(...datos.map(c => c.id_compra)) + 1;
    setDatos(prev => [...prev, { ...form, id_compra: nuevoId, cantidad: Number(form.cantidad), total: Number(form.total) }]);
    setModal(false);
  };

  const anularCompra = async (id) => {
    try {
      await api.patch(`/compras/${id}/anular`);
      setDatos(prev => prev.map(c => c.id_compra === id ? { ...c, estado: "Anulado" } : c));
    } catch (err) {
      alert(err.response?.data?.message || "Error al anular la compra");
    }
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case "Recibido":    return "compras-badge-active";
      case "Pendiente":   return "compras-badge-pending";
      case "En Tránsito": return "compras-badge-info";
      case "Anulado":     return "compras-badge-inactive";
      default:            return "compras-badge-info";
    }
  };

  return (
    <div className="compras-container">
      <div className="compras-actions-bar">
        <div className="compras-search-wrapper">
          <span className="compras-search-icon"><IconSearch /></span>
          <input type="text" className="compras-search-input" placeholder="Buscar por proveedor o ID..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          {busqueda && <button className="compras-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
        </div>
        {tienePerm('Compras.crear') && (
          <button className="compras-btn-primary" onClick={() => { setForm({ proveedor: "", producto: "", cantidad: 1, total: "", estado: "Pendiente", fecha: "" }); setModal(true); }}>
            <span>+</span> Nueva compra
          </button>
        )}
      </div>

      <div className="compras-results-count">{filtradosAll.length} compra{filtradosAll.length !== 1 ? 's' : ''} encontrada{filtradosAll.length !== 1 ? 's' : ''}</div>

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
                <td className="tbl-td"><span className="compras-proveedor-name">{c.proveedor}</span></td>
                <td className="tbl-td compras-producto-cell">{c.producto}</td>
                <td className="tbl-td compras-cantidad-cell">{c.cantidad}</td>
                <td className="tbl-td compras-total-cell">{fmt(c.total)}</td>
                <td className="tbl-td compras-fecha-cell">{c.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td"><span className={`compras-badge ${getEstadoBadge(c.estado)}`}>{c.estado}</span></td>
                <td className="tbl-td">
                  <div className="compras-action-cell">
                    <button className="compras-action-btn compras-view-btn" onClick={() => setVerDetalle(c)} title="Ver detalles"><IconEye /></button>
                    {tienePerm('Compras.anular') && c.estado !== "Anulado" && (
                      <button className="compras-action-btn compras-cancel-btn" onClick={() => anularCompra(c.id_compra)} title="Anular compra"><IconX /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtradosAll.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay compras que coincidan con la búsqueda.</td></tr>
            )}
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
          titulo="Detalle de compra" subtitulo={`C-${String(verDetalle.id_compra).padStart(3, "0")}`}
          avatar={<IconCart />}
          badge={<span className={`compras-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>}
          pasos={["Información", "Pago"]} onClose={() => setVerDetalle(null)}
        >
          <DetalleSeccion titulo="Información">
            <DetalleGrid>
              <DetalleItem label="ID" value={`C-${String(verDetalle.id_compra).padStart(3, "0")}`} />
              <DetalleItem label="Proveedor" value={verDetalle.proveedor} />
              <DetalleItem label="Producto"  value={verDetalle.producto} />
              <DetalleItem label="Cantidad"  value={verDetalle.cantidad} />
              <DetalleItem label="Fecha"     value={verDetalle.fecha?.toString().split("T")[0]} />
            </DetalleGrid>
          </DetalleSeccion>
          <DetalleSeccion titulo="Pago">
            <DetalleGrid>
              <DetalleItem label="Total"  value={fmt(verDetalle.total)} />
              <DetalleItem label="Estado" value={verDetalle.estado} />
            </DetalleGrid>
          </DetalleSeccion>
        </ModalDetalle>
      )}
    </div>
  );
}