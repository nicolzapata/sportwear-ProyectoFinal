import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { fmt, FILAS_POR_PAGINA, MONTO_MINIMO_ABONO } from "../utils/pagosAbonosHelpers";

export function usePagosAbonos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos,      setDatos]      = useState([]);
  const [totalPagos, setTotalPagos] = useState(0);
  const [ventas,     setVentas]     = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [busqueda,   setBusqueda]   = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina,     setPagina]     = useState(1);
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [form, setForm] = useState({ id_venta: "", monto: "", tipo: "Pago completo", metodo: "Efectivo", estado: "Pendiente", fecha: "" });
  const [errores, setErrores] = useState({ id_venta: "", monto: "", fecha: "" });
  // ── NUEVO: fila con el desplegable de estado abierto (solo una a la vez) ──
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  // ── NUEVO: como en Pedidos, el loader de pantalla completa solo debe
  // aparecer en la carga inicial — si no, cada búsqueda desmonta la tabla
  // completa (con el buscador adentro) y el input pierde el foco. ──
  const primerCargaHecha = useRef(false);

  const [metodosPago,    setMetodosPago]    = useState([]);
  const [modalMetodos,   setModalMetodos]   = useState(false);
  const [nuevoMetodo,    setNuevoMetodo]    = useState("");

  useEffect(() => { cargarMetodos(); api.get("/ventas").then(r => setVentas(r.data)).catch(console.error); }, []);

  const cargarMetodos = async () => {
    try {
      const { data } = await api.get("/metodos-pago");
      setMetodosPago(data);
    } catch (err) { console.error("Error cargando métodos de pago:", err); }
  };

  const crearMetodo = async () => {
    if (!nuevoMetodo.trim()) { showToast("error", "Escribe un nombre para el método de pago."); return; }
    try {
      await api.post("/metodos-pago", { nombre: nuevoMetodo.trim() });
      setNuevoMetodo("");
      cargarMetodos();
      showToast("exito", "Método de pago creado correctamente.");
    } catch (err) { showToast("error", err.response?.data?.message ?? "Error al crear el método de pago."); }
  };

  const toggleMetodoEstado = async (id) => {
    try {
      await api.patch(`/metodos-pago/${id}/estado`);
      cargarMetodos();
      showToast("exito", "Estado del método de pago actualizado.");
    } catch (err) { showToast("error", err.response?.data?.message ?? "Error al cambiar el estado del método."); }
  };

  const cargar = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/pagos", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatos(data.data);
      setTotalPagos(data.total);
    } catch (err) {
      console.error("Error cargando pagos:", err);
      setErrorMsg("No se pudieron cargar los pagos. Intenta de nuevo.");
    } finally {
      setCargando(false);
      primerCargaHecha.current = true;
    }
  };

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const handleVentaChange = (id_venta) => {
    // ── CORREGIDO: antes esto siempre fijaba tipo="Pago completo" sin
    // importar qué venta se eligiera — así que un pago para una venta a
    // cuotas también se guardaba etiquetado "Pago completo" en vez de
    // "Abono". Ahora se calcula según el tipo_pago real de la venta elegida. ──
    const ventaSel = ventas.find(v => String(v.id_venta) === String(id_venta));
    const tipoCorrecto = ventaSel?.tipo_pago === 'cuotas' ? 'Abono' : 'Pago completo';
    setForm(f => ({ ...f, id_venta, tipo: tipoCorrecto }));
    // ── NUEVO: ahora que /ventas sí trae total_pagado real, se puede avisar
    // de una vez si la venta elegida ya está completamente pagada — antes
    // esto no se detectaba nunca (total_pagado llegaba undefined = 0
    // siempre), lo que dejaba registrar pagos de más sin ningún aviso. ──
    const venta = ventas.find(v => String(v.id_venta) === String(id_venta));
    if (venta) {
      const restante = Number(venta.total || 0) - Number(venta.total_pagado || 0);
      if (restante <= 0) {
        setErrores(prev => ({ ...prev, id_venta: "Esta venta ya está completamente pagada — no tiene saldo pendiente." }));
        return;
      }
    }
    setErrores(prev => ({ ...prev, id_venta: "" }));
  };

  const totalPaginas = Math.ceil(totalPagos / FILAS_POR_PAGINA) || 1;

  const restanteVentaSeleccionada = () => {
    const venta = ventas.find(v => String(v.id_venta) === String(form.id_venta));
    if (!venta) return null;
    return Number(venta.total || 0) - Number(venta.total_pagado || 0);
  };

  const errorMonto = (monto) => {
    if (!monto || Number(monto) <= 0) return "El monto es obligatorio";
    const restante = restanteVentaSeleccionada();
    if (restante !== null && Number(monto) > restante) return "El monto no puede ser mayor al saldo de la venta";
    // ── NUEVO: mismo mínimo que valida el backend — salvo que este pago
    // liquide exactamente el saldo restante (ej. últimos $15.000 de una
    // deuda), no tendría sentido exigirle un mínimo más alto que eso. ──
    const liquidaSaldoCompleto = restante !== null && Math.abs(Number(monto) - restante) < 1;
    if (Number(monto) < MONTO_MINIMO_ABONO && !liquidaSaldoCompleto) {
      return `El monto mínimo para un abono es de ${fmt(MONTO_MINIMO_ABONO)} (a menos que liquide el saldo restante).`;
    }
    return "";
  };

  const guardar = async () => {
    const e = {};
    if (!form.id_venta) e.id_venta = "Selecciona una venta";
    const msgMonto = errorMonto(form.monto);
    if (msgMonto) e.monto = msgMonto;
    if (!form.fecha) e.fecha = "La fecha es obligatoria";
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setGuardando(true);
    try {
      await api.post("/pagos", {
        id_venta: Number(form.id_venta),
        monto:    Number(form.monto),
        tipo:     form.tipo,
        metodo:   form.metodo,
        estado:   form.estado,
        fecha:    form.fecha || new Date().toISOString().split("T")[0],
      });
      cargar();
      setModal(false);
      showToast("exito", "Pago registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message ?? "Error al registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  // ── NUEVO: reemplaza a registrarPago/cancelarPago sueltos — un solo
  // handler para el desplegable de estado, igual que en Pedidos/Compras. ──
  // ── CORREGIDO: esto hacía una actualización optimista local (solo
  // cambiaba el "estado" de la fila en memoria) y nunca volvía a pedir los
  // datos al servidor. Al confirmar/anular una cuota, la ventana de "próximas
  // cuotas" (que decide qué filas se muestran) cambia en el backend — pero
  // como nunca se recargaba, la tabla seguía mostrando la misma foto vieja
  // de antes del cambio, sin la cuota siguiente que ya debía aparecer. ──
  const cambiarEstadoPago = async (id_pago, estado) => {
    setCambiandoEstado(true);
    try {
      await api.patch(`/pagos/${id_pago}/estado`, { estado });
      await cargar();
      showToast("exito", estado === "Confirmado" ? "Pago confirmado correctamente." : "Pago anulado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message ?? "Error al actualizar el pago.");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const abrirRegistrarPago = () => {
    setForm({ id_venta: "", monto: "", tipo: "Pago completo", metodo: metodosPago[0]?.nombre || "Efectivo", estado: "Pendiente", fecha: "" });
    setErrores({ id_venta: "", monto: "", fecha: "" });
    setModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(false);
  };

  return {
    tienePerm, datos, totalPagos, ventas, cargando, errorMsg, primerCargaHecha,
    busqueda, setBusqueda, busquedaDebounced, pagina, setPagina,
    modal, setModal, verDetalle, setVerDetalle, guardando,
    form, setForm, errores, setErrores, filaAbierta, setFilaAbierta, cambiandoEstado,
    metodosPago, modalMetodos, setModalMetodos, nuevoMetodo, setNuevoMetodo,
    crearMetodo, toggleMetodoEstado, cargar, handleVentaChange, totalPaginas,
    errorMonto, guardar, cambiarEstadoPago, abrirRegistrarPago, cerrarModal,
  };
}
