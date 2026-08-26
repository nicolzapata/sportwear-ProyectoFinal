import RangoTexto from "./RangoTexto";
import { MUTED } from "../../utils/dashboardHelpers";

export default function TopProductosCard({ reporte, topProductos }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Top productos</h3>
          <p className="chart-subtitle">{reporte ? <RangoTexto reporte={reporte} /> : "Los más vendidos"}</p>
        </div>
      </div>
      <div className="top-products">
        {topProductos.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Sin datos aún.</p>
        ) : topProductos.map((producto, index) => (
          <div key={index} className="top-product">
            <div className="top-product-info">
              <span className={`top-product-rank ${index === 0 ? "gold" : ""}`}>{index + 1}</span>
              <span className="top-product-name">{producto.nombre}</span>
              <span className="top-product-count">{producto.total_vendido} uds</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${(producto.total_vendido / topProductos[0].total_vendido) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
