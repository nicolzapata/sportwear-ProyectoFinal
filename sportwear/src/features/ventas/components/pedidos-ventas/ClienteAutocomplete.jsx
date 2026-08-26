// Buscador de cliente con autocompletar — con muchos clientes, desplazarse
// en un <select> plano es incómodo. Se reemplaza por un input que filtra
// mientras escribes, mismo patrón que ya usa el buscador de productos del
// catálogo público.
export default function ClienteAutocomplete({
  clientes, formVenta, setFormVenta,
  busquedaCliente, setBusquedaCliente,
  clienteDropdownAbierto, setClienteDropdownAbierto,
  clienteInputRef,
  erroresVenta, setErroresVenta,
  cargandoDatosVenta, errorDatosVenta,
}) {
  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()));

  return (
    <div className="pedidosventas-form-group">
      <label className="pedidosventas-form-label">Cliente</label>
      <div style={{ position: "relative" }} ref={clienteInputRef}>
        <input
          type="text"
          className={`pedidosventas-form-input${erroresVenta.id_cliente ? " input-error" : ""}`}
          placeholder="Buscar cliente por nombre..."
          value={
            clienteDropdownAbierto
              ? busquedaCliente
              : (clientes.find((c) => String(c.id_cliente) === String(formVenta.id_cliente))?.nombre || "")
          }
          onFocus={() => { setBusquedaCliente(""); setClienteDropdownAbierto(true); }}
          onChange={(e) => {
            setBusquedaCliente(e.target.value);
            setClienteDropdownAbierto(true);
            if (formVenta.id_cliente) setFormVenta({ ...formVenta, id_cliente: "" });
          }}
        />
        {clienteDropdownAbierto && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "var(--dvna-white, #fff)", border: "1px solid var(--dvna-border, #e5e5e5)",
            borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
            maxHeight: 220, overflowY: "auto", padding: 4,
          }}>
            {filtrados
              .slice(0, 30)
              .map((c) => (
                <button
                  type="button"
                  key={c.id_cliente}
                  onClick={() => {
                    setFormVenta({ ...formVenta, id_cliente: c.id_cliente });
                    setErroresVenta((prev) => ({ ...prev, id_cliente: "" }));
                    setBusquedaCliente("");
                    setClienteDropdownAbierto(false);
                  }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                    border: "none", background: "transparent", borderRadius: 6, cursor: "pointer",
                    fontSize: 13, color: "var(--dvna-charcoal, #1a1a1a)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--dvna-pale, #f4f4f4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {c.nombre}
                </button>
              ))}
            {filtrados.length === 0 && (
              <div style={{ padding: "10px", fontSize: 12, color: "var(--dvna-muted, #888)", fontStyle: "italic" }}>Sin resultados</div>
            )}
          </div>
        )}
      </div>
      {erroresVenta.id_cliente && <span className="pedidosventas-field-error">{erroresVenta.id_cliente}</span>}
      {cargandoDatosVenta && (
        <span className="pedidosventas-field-error" style={{ color: "var(--muted)" }}>Cargando clientes...</span>
      )}
      {!cargandoDatosVenta && errorDatosVenta && (
        <span className="pedidosventas-field-error">{errorDatosVenta}</span>
      )}
      {!cargandoDatosVenta && !errorDatosVenta && clientes.length === 0 && (
        <span className="pedidosventas-field-error" style={{ color: "var(--muted)" }}>No hay clientes registrados.</span>
      )}
    </div>
  );
}
