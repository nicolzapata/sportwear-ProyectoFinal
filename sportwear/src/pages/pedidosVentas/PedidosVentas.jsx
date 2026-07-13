// src/pages/pedidosVentas/PedidosVentas.jsx
import { useState, useEffect } from "react";
import './PedidosVentas.css';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ExportButtons from "../../components/ExportButtons";
import { IconDollar, IconEye, IconSearch, IconX } from "../../components/Icons";

const fmt = (n) => Number(n||0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const FILAS_POR_PAGINA = 10;

const nuevoItem = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "", descuento_linea: 0 });

const formVentaInicial = () => ({
  id_cliente: "",
  fecha: new Date().toISOString().split("T")[0],
  estado: "Pendiente",       // Pendiente | Pagado
  tipo_pago: "completo",     // completo | cuotas
  num_cuotas: "",
  metodo_pago: "Efectivo",
  descuento: 0,
  impuesto: 0,
  observaciones: "",
  items: [nuevoItem()],
});

export default function PedidosVentas() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,       setDatos]       = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [busqueda,    setBusqueda]    = useState("");
  const [pagina,      setPagina]      = useState(1);
  const [verDetalle,  setVerDetalle]  = useState(null);
  const [abonosModal, setAbonosModal] = useState(null);
  const [formAbono,   setFormAbono]   = useState({ monto: "", metodo: "Efectivo", fecha: "" });
  const [erroresAbono, setErroresAbono] = useState({ monto: "", fecha: "" });

  // ── Nueva venta ──
  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [modalVenta, setModalVenta] = useState(false);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [formVenta,  setFormVenta]  = useState(formVentaInicial());
  const [erroresVenta, setErroresVenta] = useState({});

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg("");
    try {
      const [ventasRes, pagosRes] = await Promise.all([
        api.get("/ventas"),
        api.get("/pagos")
      ]);

      const ventas = ventasRes.data.map(v => {
        const abonos      = pagosRes.data.filter(p => p.id_venta === v.id_venta);
        const totalPagado = abonos.reduce((sum, p) => sum + (p.estado === "Confirmado" ? Number(p.monto) : 0), 0);

        let estado;
        if (v.estado === "Anulado") {
          estado = "Anulado";
        } else if (v.tipo_pago === 'cuotas' && v.num_cuotas) {
          const cuotasConfirmadas = abonos.filter(p => p.estado === "Confirmado" && p.num_cuota).length;
          estado = cuotasConfirmadas >= v.num_cuotas ? "Pagado" : "Pendiente";
        } else {
          estado = totalPagado >= v.total ? "Pagado" : "Pendiente";
        }

        if (estado === "Pendiente" && v.estado === "Pendiente") return null;

        return { ...v, total_pagado: totalPagado, abonos, estado };
      }).filter(Boolean);

      setDatos(ventas);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setErrorMsg("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  // ── Cargar clientes y productos solo cuando se abre el modal de nueva venta ──
  const [cargandoDatosVenta, setCargandoDatosVenta] = useState(false);
  const [errorDatosVenta,   setErrorDatosVenta]   = useState("");

  const cargarDatosVenta = async () => {
    setCargandoDatosVenta(true);
    setErrorDatosVenta("");
    try {
      const [clientesRes, productosRes] = await Promise.all([
        api.get("/clientes"),
        api.get("/productos"),
      ]);
      setClientes(clientesRes.data || []);
      setProductos((productosRes.data || []).filter(p => p.estado === "Activo"));
    } catch (err) {
      console.error("Error cargando clientes/productos:", err);
      setErrorDatosVenta(err.response?.data?.message || "No se pudieron cargar los clientes o productos.");
    } finally {
      setCargandoDatosVenta(false);
    }
  };

  const abrirNuevaVenta = () => {
    setFormVenta(formVentaInicial());
    setErroresVenta({});
    setModalVenta(true);
    cargarDatosVenta();
  };

  // ── Validaciones por campo (reutilizadas por validarVenta y por onBlur/onChange en tiempo real) ──
  const validarCampoCliente = (idCliente) => (!idCliente ? "El cliente es obligatorio" : "");
  const validarCampoFecha = (fecha) => (!fecha ? "La fecha es obligatoria" : "");
  const validarCampoNumCuotas = (numCuotas, tipoPago) =>
    (tipoPago === "cuotas" && (!numCuotas || Number(numCuotas) < 2))
      ? "Indica el número de cuotas (mínimo 2)"
      : "";

  const validarCampoItemProducto = (it) => (!it.id_producto ? "Selecciona un producto" : "");
  const validarCampoItemVariante = (it) => {
    const producto = productos.find((p) => String(p.id_producto) === String(it.id_producto));
    const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
    return (variantesActivas.length > 0 && !it.id_variante) ? "Selecciona talla y color" : "";
  };
  const validarCampoItemCantidad = (it) => (!it.cantidad || Number(it.cantidad) <= 0) ? "Cantidad inválida" : "";
  const validarCampoItemPrecio = (it) => (!it.precio_unitario || Number(it.precio_unitario) <= 0) ? "Precio inválido" : "";

  const CAMPO_A_ERROR_ITEM = {
    id_producto: { key: "producto", validar: validarCampoItemProducto },
    id_variante: { key: "variante", validar: validarCampoItemVariante },
    cantidad: { key: "cantidad", validar: validarCampoItemCantidad },
    precio_unitario: { key: "precio", validar: validarCampoItemPrecio },
  };

  const actualizarItemVenta = (index, campo, valor) => {
    const nuevoItem = { ...formVenta.items[index], [campo]: valor };
    if (campo === "id_producto") nuevoItem.id_variante = "";
    setFormVenta((prev) => {
      const items = [...prev.items];
      items[index] = nuevoItem;
      return { ...prev, items };
    });
    const info = CAMPO_A_ERROR_ITEM[campo];
    if (info || campo === "id_producto") {
      setErroresVenta((prev) => {
        const next = { ...prev };
        if (info && prev[`item_${index}_${info.key}`]) {
          next[`item_${index}_${info.key}`] = info.validar(nuevoItem);
        }
        // Cambiar de producto también puede resolver/afectar un error de variante ya mostrado
        if (campo === "id_producto" && prev[`item_${index}_variante`]) {
          next[`item_${index}_variante`] = validarCampoItemVariante(nuevoItem);
        }
        return next;
      });
    }
  };
  const agregarItemVenta = () => setFormVenta((prev) => ({ ...prev, items: [...prev.items, nuevoItem()] }));
  const quitarItemVenta = (index) =>
    setFormVenta((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));

  const subtotalVenta = formVenta.items.reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0;
    const precio = Number(it.precio_unitario) || 0;
    const desc = Number(it.descuento_linea) || 0;
    return acc + (cant * precio - desc);
  }, 0);
  const totalVenta = subtotalVenta - (Number(formVenta.descuento) || 0) + (Number(formVenta.impuesto) || 0);

  const validarVenta = () => {
    const e = {};
    const errCliente = validarCampoCliente(formVenta.id_cliente);
    if (errCliente) e.id_cliente = errCliente;
    const errFecha = validarCampoFecha(formVenta.fecha);
    if (errFecha) e.fecha = errFecha;
    const errCuotas = validarCampoNumCuotas(formVenta.num_cuotas, formVenta.tipo_pago);
    if (errCuotas) e.num_cuotas = errCuotas;
    formVenta.items.forEach((it, i) => {
      const errProducto = validarCampoItemProducto(it);
      if (errProducto) e[`item_${i}_producto`] = errProducto;
      const errVariante = validarCampoItemVariante(it);
      if (errVariante) e[`item_${i}_variante`] = errVariante;
      const errCantidad = validarCampoItemCantidad(it);
      if (errCantidad) e[`item_${i}_cantidad`] = errCantidad;
      const errPrecio = validarCampoItemPrecio(it);
      if (errPrecio) e[`item_${i}_precio`] = errPrecio;
    });
    setErroresVenta(e);
    return Object.keys(e).length === 0;
  };

  const guardarVenta = async () => {
    if (!validarVenta()) return;
    setGuardandoVenta(true);
    try {
      const payload = {
        id_cliente: Number(formVenta.id_cliente),
        descuento: Number(formVenta.descuento) || 0,
        impuesto: Number(formVenta.impuesto) || 0,
        estado: formVenta.estado,
        fecha: formVenta.fecha,
        observaciones: formVenta.observaciones || null,
        tipo_pago: formVenta.tipo_pago,
        num_cuotas: formVenta.tipo_pago === "cuotas" ? Number(formVenta.num_cuotas) : null,
        metodo_pago: formVenta.metodo_pago,
        items: formVenta.items.map((it) => ({
          id_producto: Number(it.id_producto),
          id_variante: it.id_variante ? Number(it.id_variante) : null,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          descuento_linea: Number(it.descuento_linea) || 0,
        })),
      };
      await api.post("/ventas", payload);
      setModalVenta(false);
      setFormVenta(formVentaInicial());
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || "Error al registrar la venta");
    } finally {
      setGuardandoVenta(false);
    }
  };

  const filtrados        = datos.filter(v => v.cliente?.toLowerCase().includes(busqueda.toLowerCase()));
  const totalPaginas     = Math.ceil(filtrados.length / FILAS_POR_PAGINA);
  const filtradosPagina  = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/ventas/${id}/estado`, { estado });
      setDatos(prev => prev.map(v => v.id_venta === id ? { ...v, estado } : v));
    } catch (err) {
      alert(err.response?.data?.message || "Error al cambiar estado");
    }
  };

  const agregarAbono = async () => {
    const e = {};
    const restante = abonosModal ? abonosModal.total - (abonosModal.total_pagado || 0) : 0;
    if (!formAbono.monto || Number(formAbono.monto) <= 0) e.monto = "El monto es obligatorio";
    else if (Number(formAbono.monto) > restante) e.monto = "El monto no puede ser mayor al saldo";
    if (!formAbono.fecha) e.fecha = "La fecha es obligatoria";
    setErroresAbono(e);
    if (Object.keys(e).length > 0 || !abonosModal) return;
    try {
      const { data: nuevo } = await api.post("/pagos", {
        id_venta: abonosModal.id_venta,
        monto:    Number(formAbono.monto),
        metodo:   formAbono.metodo,
        estado:   "Confirmado",
        fecha:    formAbono.fecha || new Date().toISOString().split("T")[0]
      });

      setDatos(prev => prev.map(v => {
        if (v.id_venta !== abonosModal.id_venta) return v;
        const nuevoTotal  = (v.total_pagado || 0) + Number(formAbono.monto);
        const nuevoEstado = nuevoTotal >= v.total ? "Pagado" : "Pendiente";
        return { ...v, total_pagado: nuevoTotal, estado: nuevoEstado, abonos: [...(v.abonos || []), { ...nuevo, monto: Number(formAbono.monto), estado: "Confirmado" }] };
      }));

      setAbonosModal(null);
      setFormAbono({ monto: "", metodo: "Efectivo", fecha: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Error al registrar abono");
    }
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case "Pagado":   return "pedidosventas-badge-active";
      case "Pendiente":return "pedidosventas-badge-pending";
      case "Anulado":  return "pedidosventas-badge-inactive";
      default:         return "pedidosventas-badge-info";
    }
  };

  if (cargando) return <div style={{ padding: 48, color: "var(--muted)" }}>Cargando ventas...</div>;
  if (errorMsg) return <div style={{ padding: 32, color: "var(--danger)" }}>{errorMsg}</div>;

  return (
    <div className="pedidosventas-container">
      <div className="pedidosventas-actions-bar"> 
        <div className="pedidosventas-actions-left">
          <div className="pedidosventas-search-wrapper">
            <span className="pedidosventas-search-icon"><IconSearch /></span>
            <input type="text" className="pedidosventas-search-input" placeholder="Buscar por cliente o ID..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
            {busqueda && <button className="pedidosventas-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
          </div>
        </div>
        <div className="pedidosventas-actions-right">
          {tienePerm('PedidosVentas.crear') && (
            <button className="pedidosventas-btn-primary" onClick={abrirNuevaVenta}>
              <span>+</span> Nueva venta
            </button>
          )}
          <ExportButtons
            datos={filtrados}
            columnas={[
              { header: "Cliente", key: "cliente" },
              { header: "Producto", value: (v) => v.items?.map((i) => i.producto).filter(Boolean).join(', ') || '-' },
              { header: "Cantidad", value: (v) => v.items?.reduce((sum, i) => sum + i.cantidad, 0) || 0 },
              { header: "Total", value: (v) => fmt(v.total) },
              { header: "Tipo", value: (v) => (v.tipo_pago === 'cuotas' ? `Cuotas (${v.num_cuotas})` : 'Completo') },
              { header: "Abonado", value: (v) => fmt(v.total_pagado || 0) },
              { header: "Saldo", value: (v) => fmt(v.total - (v.total_pagado || 0)) },
              { header: "Fecha", value: (v) => v.fecha?.toString().split("T")[0] || "—" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="pedidos_ventas"
            titulo="Pedidos y Ventas"
          />
        </div>
      </div>

      <div className="pedidosventas-results-count">
        {filtrados.length} venta{filtrados.length !== 1 ? 's' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Cant.</th>
              <th className="tbl-th">Total</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Abonos</th>
              <th className="tbl-th">Saldo</th>
              <th className="tbl-th">Fecha</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtradosPagina.map((v) => (
              <tr key={v.id_venta} className="tbl-row">
                <td className="tbl-td"><span className="pedidosventas-cliente-name">{v.cliente}</span></td>
                <td className="tbl-td pedidosventas-producto-cell">{v.items?.map(i => i.producto).filter(Boolean).join(', ') || '-'}</td>
                <td className="tbl-td pedidosventas-cantidad-cell">{v.items?.reduce((sum, i) => sum + i.cantidad, 0) || '-'}</td>
                <td className="tbl-td pedidosventas-total-cell">{fmt(v.total)}</td>
                <td className="tbl-td">
                  {v.tipo_pago === 'cuotas'
                    ? <span className="pedidosventas-badge pedidosventas-badge-info">Cuotas ({v.num_cuotas})</span>
                    : <span className="pedidosventas-badge">Completo</span>}
                </td>
                <td className="tbl-td">
                  <button className="pedidosventas-abonos-btn" onClick={() => setAbonosModal(v)}>
                    {v.total_pagado ? fmt(v.total_pagado) : "-"}
                  </button>
                </td>
                <td className="tbl-td">
                  <span className={`pedidosventas-saldo ${(v.total - (v.total_pagado || 0)) <= 0 ? 'pedidosventas-saldo-zero' : ''}`}>
                    {fmt(v.total - (v.total_pagado || 0))}
                  </span>
                </td>
                <td className="tbl-td pedidosventas-fecha-cell">{v.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td"><span className={`pedidosventas-badge ${getEstadoBadge(v.estado)}`}>{v.estado}</span></td>
                <td className="tbl-td">
                  <div className="pedidosventas-action-cell">
                    <button className="pedidosventas-action-btn pedidosventas-view-btn" onClick={() => setVerDetalle(v)}><IconEye /></button>
                    {tienePerm('PedidosVentas.estado') && v.estado !== "Anulado" && v.estado !== "Pagado" && (
                      <button className="pedidosventas-action-btn pedidosventas-pay-btn" onClick={() => setAbonosModal(v)} title="Agregar abono"><IconDollar /></button>
                    )}
                    {tienePerm('PedidosVentas.estado') && v.estado === "Pendiente" && (
                      <button className="pedidosventas-action-btn pedidosventas-pay-full-btn" onClick={() => cambiarEstado(v.id_venta, "Pagado")} title="Marcar como pagado"><IconDollar /></button>
                    )}
                    {tienePerm('PedidosVentas.estado') && v.estado !== "Anulado" && (
                      <button className="pedidosventas-action-btn pedidosventas-cancel-btn" onClick={() => cambiarEstado(v.id_venta, "Anulado")} title="Anular venta"><IconX /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay ventas registradas</td></tr>
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
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtrados.length} registros</span>
          </div>
        )}
      </div>

      {/* ── Modal "ver detalle" — panel único tipo factura (sin stepper) ── */}
      {verDetalle && (
        <div className="pedidosventas-modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="pedidosventas-modal pedidosventas-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="pedidosventas-modal-header">
              <div>
                <h2 className="pedidosventas-modal-title">V-{String(verDetalle.id_venta).padStart(3, "0")}</h2>
                <p className="pedidosventas-modal-subtitulo">Detalle de venta</p>
              </div>
              <button className="pedidosventas-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
            </div>

            <div className="pedidosventas-modal-body pedidosventas-factura-body">
              <div className="pedidosventas-factura-seccion">
                <h3 className="pedidosventas-factura-titulo">Información</h3>
                <div className="pedidosventas-detalle-info-grid">
                  <div><span className="pedidosventas-detalle-info-label">Cliente</span><span className="pedidosventas-detalle-info-valor">{verDetalle.cliente}</span></div>
                  <div><span className="pedidosventas-detalle-info-label">Fecha</span><span className="pedidosventas-detalle-info-valor">{verDetalle.fecha?.toString().split("T")[0]}</span></div>
                  <div><span className="pedidosventas-detalle-info-label">Tipo de pago</span><span className="pedidosventas-detalle-info-valor">{verDetalle.tipo_pago === 'cuotas' ? `Cuotas (${verDetalle.num_cuotas})` : 'Completo'}</span></div>
                  <div>
                    <span className="pedidosventas-detalle-info-label">Estado</span>
                    <span className={`pedidosventas-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>
                  </div>
                </div>
              </div>

              <div className="pedidosventas-factura-seccion">
                <h3 className="pedidosventas-factura-titulo">Productos</h3>
                {(verDetalle.items || []).map((item, i) => (
                  <div key={i} className="pedidosventas-detalle-item-linea">
                    <span>{item.producto} {item.talla ? `(${item.talla})` : ""} × {item.cantidad}</span>
                    <span>{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pedidosventas-factura-seccion">
                <h3 className="pedidosventas-factura-titulo">Pago</h3>
                <div className="pedidosventas-detalle-info-grid">
                  <div><span className="pedidosventas-detalle-info-label">Total</span><span className="pedidosventas-detalle-info-valor">{fmt(verDetalle.total)}</span></div>
                  <div><span className="pedidosventas-detalle-info-label">Abonado</span><span className="pedidosventas-detalle-info-valor">{fmt(verDetalle.total_pagado || 0)}</span></div>
                  <div><span className="pedidosventas-detalle-info-label">Saldo</span><span className="pedidosventas-detalle-info-valor">{fmt(verDetalle.total - (verDetalle.total_pagado || 0))}</span></div>
                </div>
              </div>

              {verDetalle.abonos?.length > 0 && (
                <div className="pedidosventas-factura-seccion">
                  <h3 className="pedidosventas-factura-titulo">Historial de abonos</h3>
                  {verDetalle.abonos.map((a, i) => (
                    <div key={i} className="pedidosventas-detalle-item-linea">
                      <span>{a.num_cuota ? `Cuota ${a.num_cuota}` : `Abono ${i + 1}`}</span>
                      <span>{fmt(a.monto)} · {a.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pedidosventas-modal-footer">
              <button className="pedidosventas-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {abonosModal && (
        <div className="pedidosventas-modal-overlay">
          <div className="pedidosventas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pedidosventas-modal-header">
              <h2 className="pedidosventas-modal-title">Gestionar Abonos</h2>
              <button className="pedidosventas-modal-close" onClick={() => setAbonosModal(null)}><IconX /></button>
            </div>
            <div className="pedidosventas-modal-body">
              <div className="pedidosventas-abonos-summary">
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Total</span>
                  <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total)}</span>
                </div>
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Abonado</span>
                  <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total_pagado || 0)}</span>
                </div>
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Saldo</span>
                  <span className="pedidosventas-abonos-summary-value pedidosventas-abonos-summary-saldo">{fmt(abonosModal.total - (abonosModal.total_pagado || 0))}</span>
                </div>
              </div>

              {abonosModal.abonos?.length > 0 && (
                <div className="pedidosventas-abonos-list">
                  <h4 className="pedidosventas-abonos-list-title">Historial de Abonos</h4>
                  {abonosModal.abonos.map((a, idx) => (
                    <div key={idx} className="pedidosventas-abono-item">
                      <div className="pedidosventas-abono-item-info">
                        <span className="pedidosventas-abono-item-monto">{fmt(a.monto)}</span>
                        <span className="pedidosventas-abono-item-fecha">{a.fecha?.toString().split("T")[0]}</span>
                      </div>
                      <span className="pedidosventas-badge pedidosventas-badge-active">{a.estado}</span>
                    </div>
                  ))}
                </div>
              )}

              {tienePerm('Pagos.crear') && abonosModal.estado !== "Pagado" && abonosModal.estado !== "Anulado" && (
                <div className="pedidosventas-form-section">
                  <h4 className="pedidosventas-form-section-title">Nuevo Abono</h4>
                  <div className="pedidosventas-form-row">
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Monto (COP)</label>
                      <input
                        type="number"
                        className={`pedidosventas-form-input${erroresAbono.monto ? " input-error" : ""}`}
                        placeholder={`Máx: ${fmt(abonosModal.total - (abonosModal.total_pagado || 0))}`}
                        value={formAbono.monto}
                        onChange={(e) => {
                          setFormAbono({ ...formAbono, monto: e.target.value });
                          if (erroresAbono.monto) setErroresAbono(prev => ({ ...prev, monto: "" }));
                        }}
                      />
                      {erroresAbono.monto && <span className="pedidosventas-field-error">{erroresAbono.monto}</span>}
                    </div>
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Método</label>
                      <select
                        className="pedidosventas-form-select"
                        value={formAbono.metodo}
                        onChange={(e) => setFormAbono({ ...formAbono, metodo: e.target.value })}
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>
                  </div>
                  <div className="pedidosventas-form-row">
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Fecha</label>
                      <input
                        type="date"
                        className={`pedidosventas-form-input${erroresAbono.fecha ? " input-error" : ""}`}
                        value={formAbono.fecha}
                        onChange={(e) => {
                          setFormAbono({ ...formAbono, fecha: e.target.value });
                          if (erroresAbono.fecha) setErroresAbono(prev => ({ ...prev, fecha: "" }));
                        }}
                      />
                      {erroresAbono.fecha && <span className="pedidosventas-field-error">{erroresAbono.fecha}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="pedidosventas-modal-footer">
              <button className="pedidosventas-btn-secondary" onClick={() => setAbonosModal(null)}>Cerrar</button>
              {tienePerm('Pagos.crear') && abonosModal.estado !== "Pagado" && abonosModal.estado !== "Anulado" && (
                <button className="pedidosventas-btn-primary" onClick={agregarAbono}>
                  <IconDollar /> Registrar Abono
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal "Nueva venta" ── */}
      {modalVenta && (
        <div className="pedidosventas-modal-overlay" onClick={() => !guardandoVenta && setModalVenta(false)}>
          <div className="pedidosventas-modal pedidosventas-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="pedidosventas-modal-header">
              <h2 className="pedidosventas-modal-title">Nueva venta</h2>
              <button className="pedidosventas-modal-close" onClick={() => setModalVenta(false)}><IconX /></button>
            </div>
            <div className="pedidosventas-modal-body">
              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Cliente</label>
                  <select
                    className={`pedidosventas-form-select${erroresVenta.id_cliente ? " input-error" : ""}`}
                    value={formVenta.id_cliente}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormVenta({ ...formVenta, id_cliente: value });
                      setErroresVenta((prev) => (prev.id_cliente ? { ...prev, id_cliente: validarCampoCliente(value) } : prev));
                    }}
                    onBlur={() => setErroresVenta((prev) => ({ ...prev, id_cliente: validarCampoCliente(formVenta.id_cliente) }))}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                    ))}
                  </select>
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
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Fecha</label>
                  <input
                    type="date"
                    className={`pedidosventas-form-input${erroresVenta.fecha ? " input-error" : ""}`}
                    value={formVenta.fecha}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormVenta({ ...formVenta, fecha: value });
                      setErroresVenta((prev) => (prev.fecha ? { ...prev, fecha: validarCampoFecha(value) } : prev));
                    }}
                    onBlur={() => setErroresVenta((prev) => ({ ...prev, fecha: validarCampoFecha(formVenta.fecha) }))}
                  />
                  {erroresVenta.fecha && <span className="pedidosventas-field-error">{erroresVenta.fecha}</span>}
                </div>
              </div>

              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Tipo de pago</label>
                  <select
                    className="pedidosventas-form-select"
                    value={formVenta.tipo_pago}
                    onChange={(e) => {
                      const tipo_pago = e.target.value;
                      setFormVenta({ ...formVenta, tipo_pago, num_cuotas: "" });
                      setErroresVenta((prev) => (prev.num_cuotas ? { ...prev, num_cuotas: validarCampoNumCuotas("", tipo_pago) } : prev));
                    }}
                  >
                    <option value="completo">Pago completo</option>
                    <option value="cuotas">Cuotas</option>
                  </select>
                </div>
                {formVenta.tipo_pago === "cuotas" ? (
                  <div className="pedidosventas-form-group">
                    <label className="pedidosventas-form-label">Número de cuotas</label>
                    <input
                      type="number"
                      min="2"
                      className={`pedidosventas-form-input${erroresVenta.num_cuotas ? " input-error" : ""}`}
                      value={formVenta.num_cuotas}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormVenta({ ...formVenta, num_cuotas: value });
                        setErroresVenta((prev) => (prev.num_cuotas ? { ...prev, num_cuotas: validarCampoNumCuotas(value, formVenta.tipo_pago) } : prev));
                      }}
                      onBlur={() => setErroresVenta((prev) => ({ ...prev, num_cuotas: validarCampoNumCuotas(formVenta.num_cuotas, formVenta.tipo_pago) }))}
                    />
                    {erroresVenta.num_cuotas && <span className="pedidosventas-field-error">{erroresVenta.num_cuotas}</span>}
                  </div>
                ) : (
                  <div className="pedidosventas-form-group">
                    <label className="pedidosventas-form-label">Estado</label>
                    <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado (registrar como ya pagada)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Método de pago</label>
                  <select className="pedidosventas-form-select" value={formVenta.metodo_pago} onChange={(e) => setFormVenta({ ...formVenta, metodo_pago: e.target.value })}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
                {formVenta.tipo_pago === "cuotas" && (
                  <div className="pedidosventas-form-group">
                    <label className="pedidosventas-form-label">Estado inicial</label>
                    <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Primera cuota confirmada</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pedidosventas-items-section">
                <div className="pedidosventas-items-header">
                  <label className="pedidosventas-form-label">Productos de la venta</label>
                  <button type="button" className="pedidosventas-btn-add-item" onClick={agregarItemVenta}>+ Agregar producto</button>
                </div>

                <div className="pedidosventas-item-titulos">
                  <span>Producto</span>
                  <span>Talla / Color</span>
                  <span>Cantidad</span>
                  <span>Precio unitario</span>
                  <span>Descuento</span>
                  <span>Subtotal</span>
                  <span></span>
                </div>

                {formVenta.items.map((item, i) => {
                  const cant = Number(item.cantidad) || 0;
                  const precio = Number(item.precio_unitario) || 0;
                  const desc = Number(item.descuento_linea) || 0;
                  const lineaTotal = cant * precio - desc;
                  const productoSel = productos.find((p) => String(p.id_producto) === String(item.id_producto));
                  const variantesActivas = (productoSel?.variantes || []).filter((v) => v.estado === "Activo");
                  return (
                    <div className="pedidosventas-item-row" key={i}>
                      <div>
                        <select
                          className={`pedidosventas-form-select${erroresVenta[`item_${i}_producto`] ? " input-error" : ""}`}
                          value={item.id_producto}
                          onChange={(e) => actualizarItemVenta(i, "id_producto", e.target.value)}
                          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_producto`]: validarCampoItemProducto(formVenta.items[i]) }))}
                        >
                          <option value="">Producto...</option>
                          {productos.map((p) => (
                            <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          className={`pedidosventas-form-select${erroresVenta[`item_${i}_variante`] ? " input-error" : ""}`}
                          value={item.id_variante}
                          onChange={(e) => actualizarItemVenta(i, "id_variante", e.target.value)}
                          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_variante`]: validarCampoItemVariante(formVenta.items[i]) }))}
                          disabled={!item.id_producto || variantesActivas.length === 0}
                        >
                          <option value="">
                            {!item.id_producto ? "Elige un producto" : variantesActivas.length === 0 ? "Sin variantes" : "Talla / color..."}
                          </option>
                          {variantesActivas.map((v) => (
                            <option key={v.id_variante} value={v.id_variante}>
                              {v.talla} · {v.color_nombre} (stock: {v.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          className={`pedidosventas-form-input${erroresVenta[`item_${i}_cantidad`] ? " input-error" : ""}`}
                          value={item.cantidad}
                          onChange={(e) => actualizarItemVenta(i, "cantidad", e.target.value)}
                          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_cantidad`]: validarCampoItemCantidad(formVenta.items[i]) }))}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          placeholder="Precio"
                          className={`pedidosventas-form-input${erroresVenta[`item_${i}_precio`] ? " input-error" : ""}`}
                          value={item.precio_unitario}
                          onChange={(e) => actualizarItemVenta(i, "precio_unitario", e.target.value)}
                          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_precio`]: validarCampoItemPrecio(formVenta.items[i]) }))}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          placeholder="Desc."
                          className="pedidosventas-form-input"
                          value={item.descuento_linea}
                          onChange={(e) => actualizarItemVenta(i, "descuento_linea", e.target.value)}
                        />
                      </div>
                      <div className="pedidosventas-item-subtotal">{fmt(lineaTotal)}</div>
                      <button
                        type="button"
                        className="pedidosventas-item-remove"
                        onClick={() => quitarItemVenta(i)}
                        disabled={formVenta.items.length === 1}
                        title="Quitar producto"
                      >
                        <IconX />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Descuento general (COP)</label>
                  <input
                    type="number"
                    min="0"
                    className="pedidosventas-form-input"
                    value={formVenta.descuento}
                    onChange={(e) => setFormVenta({ ...formVenta, descuento: e.target.value })}
                  />
                </div>
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Impuesto (COP)</label>
                  <input
                    type="number"
                    min="0"
                    className="pedidosventas-form-input"
                    value={formVenta.impuesto}
                    onChange={(e) => setFormVenta({ ...formVenta, impuesto: e.target.value })}
                  />
                </div>
              </div>

              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Observaciones (opcional)</label>
                <textarea
                  className="pedidosventas-form-input"
                  rows={2}
                  value={formVenta.observaciones}
                  onChange={(e) => setFormVenta({ ...formVenta, observaciones: e.target.value })}
                />
              </div>

              <div className="pedidosventas-total-resumen">
                <span>Subtotal: {fmt(subtotalVenta)}</span>
                <span className="pedidosventas-total-final">Total: {fmt(totalVenta)}</span>
              </div>
            </div>
            <div className="pedidosventas-modal-footer">
              <button className="pedidosventas-btn-secondary" onClick={() => setModalVenta(false)} disabled={guardandoVenta}>Cancelar</button>
              <button className="pedidosventas-btn-primary" onClick={guardarVenta} disabled={guardandoVenta}>
                {guardandoVenta ? "Guardando..." : "Registrar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}