import RangoTexto from "./RangoTexto";
import { MUTED } from "../../utils/dashboardHelpers";

export default function ClientesRecientesCard({
  reporte, clientesRecientes,
  clientesRecientesPagina, setClientesRecientesPagina, clientesRecientesPorPagina,
}) {
  const totalPaginasClientes = Math.ceil(clientesRecientes.length / clientesRecientesPorPagina) || 1;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          {/* ── Con un rango activo, esta lista deja de ser "los
              últimos en registrarse en general" y pasa a ser los
              clientes que se registraron DENTRO de ese rango de
              fechas — el título lo dice explícitamente para no
              confundir con clientes que compraron en el rango. ── */}
          <h3 className="chart-title">{reporte ? "Clientes en el rango" : "Clientes recientes"}</h3>
          <p className="chart-subtitle">{reporte ? <RangoTexto reporte={reporte} /> : "Últimos registrados"}</p>
        </div>
      </div>
      <div className="top-products">
        {clientesRecientes.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Sin datos aún.</p>
        ) : clientesRecientes
            .slice((clientesRecientesPagina - 1) * clientesRecientesPorPagina, clientesRecientesPagina * clientesRecientesPorPagina)
            .map((cliente) => (
          <div key={cliente.id_cliente} className="top-product">
            <div className="top-product-info">
              <span className="top-product-name">{cliente.nombre}</span>
              <span className="top-product-count">
                {cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      {totalPaginasClientes > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setClientesRecientesPagina(p => Math.max(p - 1, 1))} disabled={clientesRecientesPagina === 1}>‹</button>
          {Array.from({ length: totalPaginasClientes }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === clientesRecientesPagina ? "paginador-btn-active" : ""}`} onClick={() => setClientesRecientesPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setClientesRecientesPagina(p => Math.min(p + 1, totalPaginasClientes))} disabled={clientesRecientesPagina === totalPaginasClientes}>›</button>
          <span className="paginador-info">Página {clientesRecientesPagina} de {totalPaginasClientes} · {clientesRecientes.length} clientes</span>
        </div>
      )}
    </div>
  );
}
