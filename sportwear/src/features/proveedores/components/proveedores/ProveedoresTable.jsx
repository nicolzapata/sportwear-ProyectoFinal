import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEye } from "../../../../shared/components/Icons";

export default function ProveedoresTable({
  datos, tienePerm, toggleEstado, setVerDetalle, abrirEditar,
  totalPaginas, pagina, setPagina, totalProveedores,
}) {
  return (
    <div className="tbl-frame">
    <div className="tbl-container">
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Documento</th>
            <th className="tbl-th">Empresa</th>
            <th className="tbl-th">Contacto</th>
            <th className="tbl-th">Teléfono</th>
            <th className="tbl-th">Email</th>
            <th className="tbl-th">Ciudad</th>
            <th className="tbl-th">Compras</th>
            {tienePerm('Proveedores.estado') && <th className="tbl-th">Estado</th>}
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.map((p) => (
            <tr key={p.id_proveedor} className="tbl-row">
              <td className="tbl-td"><code className="proveedores-nit-code">{p.tipo_doc} {p.numero_doc}</code></td>
              <td className="tbl-td">
                <span className="proveedores-empresa-name">{p.razon_social}</span>
                {p.nombre_comercial && <div className="proveedores-empresa-sub">{p.nombre_comercial}</div>}
              </td>
              <td className="tbl-td proveedores-contacto-cell">{p.nombre_contacto || "—"}</td>
              <td className="tbl-td proveedores-telefono-cell">{p.telefono_celular || "—"}</td>
              <td className="tbl-td proveedores-telefono-cell">{p.email_contacto || "—"}</td>
              <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad || "—"}</span></td>
              <td className="tbl-td">{p.total_compras ?? 0}</td>
              {tienePerm('Proveedores.estado') && (
                <td className="tbl-td"><StatusToggle id={p.id_proveedor} estado={p.estado} onToggle={() => toggleEstado(p.id_proveedor)} nombreRegistro={p.nombre_comercial || p.razon_social} /></td>
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
          {datos.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                No hay proveedores registrados todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalProveedores} registros</span>
        </div>
      )}
    </div>
    </div>
  );
}
