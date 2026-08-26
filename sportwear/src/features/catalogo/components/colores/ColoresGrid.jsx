export default function ColoresGrid({ datos }) {
  return (
    <div className="colores-grid">
      {datos.filter(c => c.estado === "Activo").map((c) => (
        <div key={c.id_color} className="colores-grid-item">
          <div className="colores-grid-sample" style={{ backgroundColor: c.codigo_hex }} />
          <div className="colores-grid-info">
            <div className="colores-grid-name">{c.nombre}</div>
            <div className="colores-grid-hex">{c.codigo_hex}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
