import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import { MAX_MONTO } from "../../../shared/utils/numerico";
import {
  HOY_ISO, nuevoItem, formVentaInicial,
  errorItemCantidad, errorItemPrecio, errorItemDescuento,
  MAX_NUM_CUOTAS, opcionesCuotasDisponibles,
} from "../utils/pedidosVentasHelpers";

/**
 * useAltaVentaState
 *
 * Formulario de "Nueva venta" (NuevaVentaModal): selección de cliente y
 * productos, cálculo de totales/cuotas, validación y guardado — separado
 * del listado (useVentasListado), al que solo le pide `cargar()` para
 * refrescar la tabla tras registrar la venta.
 */
export function useAltaVentaState({ cargar }) {
  const showToast = useToast();

  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteDropdownAbierto, setClienteDropdownAbierto] = useState(false);
  const clienteInputRef = useRef(null);
  // ── NUEVO: métodos de pago reales, traídos de Pagos — antes estaban fijos
  // en el código ("Efectivo"/"Tarjeta"/"Transferencia"), sin relación con lo
  // que el admin gestiona en Pagos → "Métodos de pago". También los usa
  // AbonosModal (se reutiliza el mismo listado, ver orquestador). ──
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

  // ── NUEVO: opciones estándar de cuotas (2,3,4,6,9,12,18,24,36) filtradas
  // por lo que el total de la venta permita — mismo criterio que Carrito y
  // Checkout. Si el total cambia (se agrega/quita un producto) y la cuota
  // elegida deja de ser válida, se resetea sola. ──
  const opcionesCuotasVenta = opcionesCuotasDisponibles(totalVenta);
  useEffect(() => {
    if (formVenta.tipo_pago === "cuotas" && formVenta.num_cuotas && !opcionesCuotasVenta.includes(Number(formVenta.num_cuotas))) {
      setFormVenta((prev) => ({ ...prev, num_cuotas: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalVenta, formVenta.tipo_pago]);

  const validarVenta = () => {
    const e = {};
    if (!formVenta.id_cliente) e.id_cliente = "El cliente es obligatorio";
    if (!formVenta.fecha) e.fecha = "La fecha es obligatoria";
    else if (formVenta.fecha > HOY_ISO) e.fecha = "La fecha no puede ser futura";
    if (formVenta.tipo_pago === "cuotas") {
      const n = Number(formVenta.num_cuotas);
      if (!formVenta.num_cuotas || n < 2) e.num_cuotas = "Selecciona el número de cuotas";
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
        fecha_primera_cuota: formVenta.tipo_pago === "cuotas" ? (formVenta.fecha_primera_cuota || formVenta.fecha) : null,
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

  return {
    clientes, productos,
    busquedaCliente, setBusquedaCliente, clienteDropdownAbierto, setClienteDropdownAbierto, clienteInputRef,
    metodosPago, modalVenta, setModalVenta, guardandoVenta,
    formVenta, setFormVenta, erroresVenta, setErroresVenta,
    creditoInfo, cargandoCredito, cargandoDatosVenta, errorDatosVenta,
    abrirNuevaVenta, errorItemStock, actualizarItemVenta, agregarItemVenta, quitarItemVenta,
    subtotalVenta, totalVenta, opcionesCuotasVenta, guardarVenta,
  };
}
