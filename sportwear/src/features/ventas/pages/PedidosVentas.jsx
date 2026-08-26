// src/pages/pedidosVentas/PedidosVentas.jsx
import { useState, useEffect, useRef } from "react";
// PedidosVentas.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import './PedidosVentas.layout.css';
import './PedidosVentas.modals.css';
import './PedidosVentas.form.css';
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { MAX_MONTO } from "../../../shared/utils/numerico";
import Loader from "../../../shared/components/Loader";
import { IconSearch, IconX } from "../../../shared/components/Icons";
import OrigenFilterToggle from "../components/pedidos-ventas/OrigenFilterToggle";
import VentasTable from "../components/pedidos-ventas/VentasTable";
import VentaDetalleModal from "../components/pedidos-ventas/VentaDetalleModal";
import AbonosModal from "../components/pedidos-ventas/AbonosModal";
import NuevaVentaModal from "../components/pedidos-ventas/NuevaVentaModal";
import {
  FILAS_POR_PAGINA, HOY_ISO, nuevoItem, formVentaInicial,
  errorItemCantidad, errorItemPrecio, errorItemDescuento,
  MAX_NUM_CUOTAS,
} from "../utils/pedidosVentasHelpers";

// ── NUEVO: ícono propio de "reporte" (documento con líneas + gráfica
// pequeña) — antes se usaba IconPrint, que no se leía como un reporte. ──
const IconReporte = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
);

export default function PedidosVentas() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos,       setDatos]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [cargando,    setCargando]    = useState(true);
  // ── NUEVO: antes, cada cambio de filtro/búsqueda volvía a poner
  // cargando=true, y como el componente hacía "if (cargando) return
  // <Loader/>", TODA la tabla (con el buscador y las pestañas adentro) se
  // desmontaba y remontaba — por eso se sentía como si la página se
  // refrescara al cambiar de pestaña. Ahora el loader de pantalla completa
  // solo se muestra en la carga inicial. ──
  const primerCargaHecha = useRef(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [busqueda,    setBusqueda]    = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina,      setPagina]      = useState(1);
  const [verDetalle,  setVerDetalle]  = useState(null);
  const [abonosModal, setAbonosModal] = useState(null);
  const [formAbono,   setFormAbono]   = useState({ monto: "", metodo: "Efectivo", fecha: "" });
  const [erroresAbono, setErroresAbono] = useState({ monto: "", fecha: "" });
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // ── Nueva venta ──
  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  // ── NUEVO: filtro de pestañas "Todas / Cliente / Admin" al lado del
  // buscador — mismo patrón que "Usuarios"/"Clientes" en el módulo de
  // Usuarios. Filtra según quién registró la venta: el cliente desde la
  // Landing, o el administrador directamente aquí. ──
  const [filtroOrigen, setFiltroOrigen] = useState(""); // "" = Todas | "Landing" | "Admin"
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteDropdownAbierto, setClienteDropdownAbierto] = useState(false);
  const clienteInputRef = useRef(null);
  // ── NUEVO: métodos de pago reales, traídos de Pagos — antes estaban fijos
  // en el código ("Efectivo"/"Tarjeta"/"Transferencia"), sin relación con lo
  // que el admin gestiona en Pagos → "Métodos de pago". ──
  const [metodosPago, setMetodosPago] = useState([]);

  useEffect(() => {
    api.get("/metodos-pago?activos=1").then(({ data }) => setMetodosPago(data || [])).catch(() => setMetodosPago([]));
  }, []);
  const [modalVenta, setModalVenta] = useState(false);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [formVenta,  setFormVenta]  = useState(formVentaInicial());
  const [erroresVenta, setErroresVenta] = useState({});
  const [creditoInfo, setCreditoInfo] = useState(null);
  const [cargandoCredito, setCargandoCredito] = useState(false);
  const [cargandoDatosVenta, setCargandoDatosVenta] = useState(false);
  const [errorDatosVenta,   setErrorDatosVenta]   = useState("");

  // Buscador con debounce: evita disparar una petición por cada tecla.
  // ── CORREGIDO: antes "resetear a página 1" vivía en un efecto aparte que
  // dependía de busquedaDebounced/filtroOrigen — eso significaba que un
  // solo cambio de filtro disparaba DOS ciclos de carga en cadena (uno con
  // la página vieja, otro ya con página 1), lo cual se sentía como que la
  // pantalla "recargaba" de golpe. Ahora se resetea la página en el mismo
  // lugar donde se origina cada cambio, para que sea un solo re-render. ──
  useEffect(() => {
    const t = setTimeout(() => { setBusquedaDebounced(busqueda); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(false, pagina, busquedaDebounced); }, [pagina, busquedaDebounced, filtroOrigen]);

  const cargar = async (silencioso = false, pag = pagina, q = busquedaDebounced) => {
    if (!silencioso) {
      setCargando(true);
    }
    setErrorMsg("");
    const inicio = Date.now();
    try {
      const { data } = await api.get("/ventas", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined, origen: filtroOrigen || undefined } });

      const ventas = data.data.map(v => {
        const abonos      = v.abonos || [];
        const totalPagado = v.total_pagado || 0;

        // ── CORREGIDO: antes, para ventas a cuotas, el estado se calculaba
        // contando cuántos abonos tenían "num_cuota" marcado como Confirmado
        // — pero los abonos registrados a mano desde esta misma pantalla
        // (botón "Registrar Abono"/"Registrar Pago") nunca mandan num_cuota,
        // así que sí sumaban al total pagado pero NUNCA contaban para este
        // cálculo. Resultado: una venta con "Sin saldo" (100% pagado) podía
        // seguir mostrando "Pendiente" en el badge de Estado.
        //
        // Ahora se usa un solo criterio, igual para cuotas y pago completo:
        // si lo pagado ya cubre el total, está Pagado — sin importar cómo
        // se etiquetó cada abono individual. Es la misma plata, un solo
        // criterio, sin contradicciones entre la barra de progreso y el badge. ──
        let estado;
        if (v.estado === "Anulado") {
          estado = "Anulado";
        } else {
          estado = totalPagado >= v.total ? "Pagado" : "Pendiente";
        }

        return { ...v, total_pagado: totalPagado, abonos, estado };
      });

      if (!silencioso) {
        const transcurrido = Date.now() - inicio;
        if (transcurrido < 400) await new Promise((r) => setTimeout(r, 400 - transcurrido));
      }

      setDatos(ventas);
      setTotal(data.total);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setErrorMsg("Error al cargar los datos");
    } finally {
      if (!silencioso) setCargando(false);
      primerCargaHecha.current = true;
    }
  };

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

  useEffect(() => {
    if (!modalVenta || formVenta.tipo_pago !== "cuotas" || !formVenta.id_cliente) {
      setCreditoInfo(null);
      return;
    }
    let cancelado = false;
    setCargandoCredito(true);
    api.get(`/ventas/credito/${formVenta.id_cliente}`)
      .then(({ data }) => { if (!cancelado) setCreditoInfo(data); })
      .catch(() => { if (!cancelado) setCreditoInfo(null); })
      .finally(() => { if (!cancelado) setCargandoCredito(false); });
    return () => { cancelado = true; };
  }, [modalVenta, formVenta.id_cliente, formVenta.tipo_pago]);

  // ── NUEVO: cierra el desplegable de clientes al hacer clic afuera ──
  useEffect(() => {
    if (!clienteDropdownAbierto) return;
    const cerrar = (e) => {
      if (clienteInputRef.current && !clienteInputRef.current.contains(e.target)) {
        setClienteDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [clienteDropdownAbierto]);

  const abrirNuevaVenta = () => {
    setFormVenta(formVentaInicial());
    setErroresVenta({});
    setBusquedaCliente("");
    setClienteDropdownAbierto(false);
    setModalVenta(true);
    cargarDatosVenta();
  };

  // ── NUEVO: encuentra la variante seleccionada de un ítem, para poder
  // validar su stock disponible en tiempo real. ──
  const getVarianteSeleccionada = (item) => {
    const producto = productos.find((p) => String(p.id_producto) === String(item.id_producto));
    return (producto?.variantes || []).find((v) => String(v.id_variante) === String(item.id_variante));
  };

  // ── NUEVO: la cantidad no puede superar el stock disponible de la
  // variante elegida — mismo criterio en tiempo real y en el submit. ──
  const errorItemStock = (item) => {
    const variante = getVarianteSeleccionada(item);
    if (!variante) return ""; // producto sin variantes (no hay stock que validar aquí)
    const cant = Number(item.cantidad) || 0;
    if (cant > variante.stock) return `Solo hay ${variante.stock} unidades disponibles`;
    return "";
  };

  const actualizarItemVenta = (index, campo, valor) => {
    setFormVenta((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [campo]: valor };
      if (campo === "id_producto") {
        items[index].id_variante = "";
        const producto = productos.find((p) => String(p.id_producto) === String(valor));
        items[index].precio_unitario = producto?.precio ?? "";
      }
      return { ...prev, items };
    });
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
    if (!formVenta.id_cliente) e.id_cliente = "El cliente es obligatorio";
    if (!formVenta.fecha) e.fecha = "La fecha es obligatoria";
    else if (formVenta.fecha > HOY_ISO) e.fecha = "La fecha no puede ser futura";
    if (formVenta.tipo_pago === "cuotas") {
      const n = Number(formVenta.num_cuotas);
      if (!formVenta.num_cuotas || n < 2) e.num_cuotas = "Indica el número de cuotas (mínimo 2)";
      else if (!Number.isInteger(n)) e.num_cuotas = "Debe ser un número entero";
      else if (n > MAX_NUM_CUOTAS) e.num_cuotas = `No puede ser mayor a ${MAX_NUM_CUOTAS} cuotas`;
    }
    if (Number(formVenta.descuento) > 0 && !formVenta.motivo_descuento?.trim()) {
      e.motivo_descuento = "Indica el motivo del descuento";
    }
    if (Number(formVenta.descuento) < 0) e.descuento = "No puede ser negativo";
    else if (Number(formVenta.descuento) > subtotalVenta) e.descuento = "No puede ser mayor al subtotal";
    if (Number(formVenta.impuesto) < 0) e.impuesto = "No puede ser negativo";
    else if (Number(formVenta.impuesto) > MAX_MONTO) e.impuesto = `No puede ser mayor a ${MAX_MONTO.toLocaleString("es-CO")}`;
    formVenta.items.forEach((it, i) => {
      if (!it.id_producto) e[`item_${i}_producto`] = "Selecciona un producto";
      const producto = productos.find((p) => String(p.id_producto) === String(it.id_producto));
      const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
      if (variantesActivas.length > 0 && !it.id_variante) e[`item_${i}_variante`] = "Selecciona talla y color";
      const msgCantidad = errorItemCantidad(it.cantidad);
      if (msgCantidad) e[`item_${i}_cantidad`] = msgCantidad;
      // ── NUEVO: no dejar registrar más unidades de las que hay en stock ──
      else {
        const msgStock = errorItemStock(it);
        if (msgStock) e[`item_${i}_cantidad`] = msgStock;
      }
      const msgPrecio = errorItemPrecio(it.precio_unitario);
      if (msgPrecio) e[`item_${i}_precio`] = msgPrecio;
      const msgDescLinea = errorItemDescuento(it.descuento_linea, it.cantidad, it.precio_unitario);
      if (msgDescLinea) e[`item_${i}_descuento`] = msgDescLinea;
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
        motivo_descuento: Number(formVenta.descuento) > 0 ? formVenta.motivo_descuento.trim() : null,
        impuesto: Number(formVenta.impuesto) || 0,
        estado: formVenta.estado,
        fecha: formVenta.fecha,
        observaciones: formVenta.observaciones || null,
        direccion_entrega: formVenta.direccion_entrega?.trim() || null,
        tipo_pago: formVenta.tipo_pago,
        num_cuotas: formVenta.tipo_pago === "cuotas" ? Number(formVenta.num_cuotas) : null,
        // ── NUEVO: se manda el método solo cuando de verdad aplica a algo
        // concreto — pago completo (siempre), o cuotas cuando se confirma la
        // primera cuota de una vez (ese método es para ESA cuota puntual).
        // Si es cuotas y queda "Pendiente", no hay ningún pago que describir
        // todavía, así que no se manda nada. ──
        metodo_pago: (formVenta.tipo_pago !== "cuotas" || formVenta.estado === "Pagado") ? formVenta.metodo_pago : null,
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
      showToast("exito", "Venta registrada correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al registrar la venta");
    } finally {
      setGuardandoVenta(false);
    }
  };

  const totalPaginas = Math.ceil(total / FILAS_POR_PAGINA) || 1;

  const cambiarEstado = async (id, estado) => {
    setCambiandoEstado(true);
    try {
      await api.patch(`/ventas/${id}/estado`, { estado });
      await cargar(true);
      showToast("exito", `Venta marcada como "${estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al cambiar estado");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const agregarAbono = async () => {
    const e = {};
    const restante = abonosModal ? abonosModal.total - (abonosModal.total_pagado || 0) : 0;
    const esCuotas = abonosModal?.tipo_pago === "cuotas";
    const montoAEnviar = esCuotas ? Number(formAbono.monto) : restante;

    if (esCuotas) {
      if (!formAbono.monto || Number(formAbono.monto) <= 0) e.monto = "El monto es obligatorio";
      else if (Number(formAbono.monto) > restante) e.monto = "El monto no puede ser mayor al saldo";
    }
    if (!formAbono.fecha) e.fecha = "La fecha es obligatoria";
    else if (formAbono.fecha > HOY_ISO) e.fecha = "La fecha no puede ser futura";
    setErroresAbono(e);
    if (Object.keys(e).length > 0 || !abonosModal) return;

    setGuardandoAbono(true);
    try {
      await api.post("/pagos", {
        id_venta: abonosModal.id_venta,
        monto:    montoAEnviar,
        metodo:   formAbono.metodo,
        estado:   "Confirmado",
        fecha:    formAbono.fecha || new Date().toISOString().split("T")[0]
      });

      await cargar(true);

      setAbonosModal(null);
      setFormAbono({ monto: "", metodo: "Efectivo", fecha: "" });
      showToast("exito", "Pago registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al registrar el pago");
    } finally {
      setGuardandoAbono(false);
    }
  };

  if (cargando && !primerCargaHecha.current) return <Loader text="Cargando ventas..." />;

  if (errorMsg) return (
    <div className="pedidosventas-container">
      <div className="pedidosventas-error-banner"><IconX /> {errorMsg}</div>
    </div>
  );

  return (
    <div className="pedidosventas-container">
      <div className="pedidosventas-actions-bar">
        <div className="pedidosventas-actions-left">
          <div className="pedidosventas-search-wrapper">
            <span className="pedidosventas-search-icon"><IconSearch /></span>
            <input type="text" className="pedidosventas-search-input" placeholder="Buscar por cliente o ID..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && <button className="pedidosventas-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>
          <OrigenFilterToggle filtroOrigen={filtroOrigen} setFiltroOrigen={setFiltroOrigen} setPagina={setPagina} />
        </div>
        <div className="pedidosventas-actions-right">
          {tienePerm('Ventas.crear') && (
            <button className="pedidosventas-btn-primary" onClick={abrirNuevaVenta}>
              <span>+</span> Nueva venta
            </button>
          )}
          <button className="btn-print" onClick={() => window.print()} title="Imprimir reporte"><IconReporte /></button>
        </div>
      </div>

      <div className="pedidosventas-results-count">
        {`${total} venta${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`}
      </div>

      <VentasTable
        datos={datos} cargando={cargando} tienePerm={tienePerm}
        filaAbierta={filaAbierta} setFilaAbierta={setFilaAbierta}
        cambiandoEstado={cambiandoEstado} cambiarEstado={cambiarEstado}
        setVerDetalle={setVerDetalle} setAbonosModal={setAbonosModal}
        totalPaginas={totalPaginas} pagina={pagina} setPagina={setPagina} total={total}
      />

      {/* ── Modal "ver detalle" — panel único tipo factura (sin stepper) ── */}
      <VentaDetalleModal verDetalle={verDetalle} setVerDetalle={setVerDetalle} />

      <AbonosModal
        abonosModal={abonosModal} setAbonosModal={setAbonosModal} tienePerm={tienePerm}
        formAbono={formAbono} setFormAbono={setFormAbono}
        erroresAbono={erroresAbono} setErroresAbono={setErroresAbono}
        metodosPago={metodosPago} guardandoAbono={guardandoAbono} agregarAbono={agregarAbono}
      />

      {/* ── Modal "Nueva venta" ── */}
      <NuevaVentaModal
        modalVenta={modalVenta} setModalVenta={setModalVenta}
        guardandoVenta={guardandoVenta} guardarVenta={guardarVenta}
        formVenta={formVenta} setFormVenta={setFormVenta}
        erroresVenta={erroresVenta} setErroresVenta={setErroresVenta}
        clientes={clientes} productos={productos} metodosPago={metodosPago}
        busquedaCliente={busquedaCliente} setBusquedaCliente={setBusquedaCliente}
        clienteDropdownAbierto={clienteDropdownAbierto} setClienteDropdownAbierto={setClienteDropdownAbierto}
        clienteInputRef={clienteInputRef}
        cargandoDatosVenta={cargandoDatosVenta} errorDatosVenta={errorDatosVenta}
        cargandoCredito={cargandoCredito} creditoInfo={creditoInfo}
        actualizarItemVenta={actualizarItemVenta} agregarItemVenta={agregarItemVenta}
        quitarItemVenta={quitarItemVenta} errorItemStock={errorItemStock}
        subtotalVenta={subtotalVenta} totalVenta={totalVenta}
      />
    </div>
  );
}
