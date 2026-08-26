import { Fragment } from "react";
import { IconAlertTriangle } from "../../../../shared/components/Icons";
import { MUTED } from "../../utils/dashboardHelpers";

export default function BajoStockTable({ bajoStockAgrupado, expandidosStock, toggleExpandidoStock }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Productos con bajo stock</h3>
          <p className="chart-subtitle">Variantes con menos de 5 unidades disponibles — estado actual</p>
        </div>
      </div>
      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Talla</th>
              <th className="tbl-th">Color</th>
              <th className="tbl-th">Stock</th>
            </tr>
          </thead>
          <tbody>
            {bajoStockAgrupado.length === 0 ? (
              <tr><td className="tbl-td" colSpan={4} style={{ textAlign: "center", color: MUTED }}>Sin productos en alerta.</td></tr>
            ) : bajoStockAgrupado.map((grupo) => {
              const multiplesVariantes = grupo.variantes.length > 1;
              const abierto = !!expandidosStock[grupo.key];
              const stockMinimo = Math.min(...grupo.variantes.map((v) => v.stock));
              const unica = grupo.variantes[0];
              return (
                <Fragment key={grupo.key}>
                  <tr
                    className="tbl-row bajostock-row-principal"
                    onClick={() => multiplesVariantes && toggleExpandidoStock(grupo.key)}
                    style={{ cursor: multiplesVariantes ? "pointer" : "default" }}
                  >
                    <td className="tbl-td" style={multiplesVariantes ? { fontWeight: 600 } : undefined}>
                      {multiplesVariantes && (
                        <span className={`bajostock-chevron-btn${abierto ? " abierto" : ""}`}>›</span>
                      )}
                      {grupo.nombre}
                      {multiplesVariantes && (
                        <span className="bajostock-count">
                          {grupo.variantes.length} variantes
                        </span>
                      )}
                    </td>
                    <td className="tbl-td">{multiplesVariantes ? "—" : (unica.talla || "—")}</td>
                    <td className="tbl-td">{multiplesVariantes ? "—" : (unica.color || "—")}</td>
                    <td className="tbl-td">
                      <span className="tabla-badge" style={{ color: stockMinimo === 0 ? "#b83232" : "#7a5500" }}>
                        <IconAlertTriangle />
                        {multiplesVariantes
                          ? ` Mínimo: ${stockMinimo}${stockMinimo === 0 ? " (agotado)" : ""}`
                          : ` ${unica.stock} ${unica.stock === 0 ? "(agotado)" : ""}`}
                      </span>
                    </td>
                  </tr>
                  {abierto && grupo.variantes.map((v, i) => (
                    <tr key={`${grupo.key}-${i}`} className="tbl-row bajostock-row-variante">
                      <td className="tbl-td bajostock-td-indent">–</td>
                      <td className="tbl-td">{v.talla || "—"}</td>
                      <td className="tbl-td">{v.color || "—"}</td>
                      <td className="tbl-td">
                        <span className="tabla-badge" style={{ color: v.stock === 0 ? "#b83232" : "#7a5500" }}>
                          <IconAlertTriangle /> {v.stock} {v.stock === 0 ? "(agotado)" : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
