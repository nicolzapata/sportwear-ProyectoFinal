import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useConfirm } from "../../../shared/contexts/ConfirmContext";
import {
  FILAS_POR_PAGINA, nuevoItem, formInicial,
  errorFecha, errorItemCantidad,
  errorItemPrecio, errorItemPrecioVenta, errorDescuentoGeneral,
} from "../utils/comprasHelpers";

export function useCompras() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();
  const confirmar = useConfirm();

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalCompras, setTotalCompras] = useState(0);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoEditado, setEstadoEditado] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [form, setForm] = useState(formInicial());
  const [errores, setErrores] = useState({});
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstadoTabla, setCambiandoEstadoTabla] = useState(false);

  const cargarCompras = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    try {
      const { data } = await api.get("/compras", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setCompras(data.data || []);
      setTotalCompras(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar la información de compras. Verifica tu conexión o tus permisos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setError("");
    api.get("/proveedores").then(({ data }) => setProveedores(data)).catch(() => {});
    api.get("/productos").then(({ data }) => setProductos((data || []).filter((p) => p.estado === "Activo"))).catch(() => {});
  }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarCompras(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalCompras / FILAS_POR_PAGINA) || 1;

  // ── Manejo de líneas de producto dentro del formulario ──
  const actualizarItem = (index, campo, valor) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [campo]: valor };
      if (campo === "id_producto") items[index].id_variante = "";

      // ── NUEVO: con el interruptor "mismo precio de venta" activo, al
      // escribir el valor de venta de una línea se replica automáticamente
      // a las demás líneas del MISMO producto (id_producto igual) — nunca a
      // un producto distinto, aunque esté en la misma compra. ──
      if (campo === "precio_venta" && prev.mismoPrecioVenta) {
        const idProductoEditado = items[index].id_producto;
        if (idProductoEditado) {
          items.forEach((it, i) => {
            if (i !== index && it.id_producto === idProductoEditado) {
              items[i] = { ...it, precio_venta: valor };
            }
          });
        }
      }

      return { ...prev, items };
    });
  };
  const agregarItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, nuevoItem()] }));
  const quitarItem = (index) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));

  // ── NUEVO: alternar el interruptor "mismo precio de venta". Al activarlo,
  // aplica de una vez el precio_venta de la primera línea de cada producto
  // a sus demás líneas — así el efecto se siente inmediato, no solo hacia
  // adelante en próximas ediciones. ──
  const toggleMismoPrecio = () => {
    setForm((prev) => {
      const activando = !prev.mismoPrecioVenta;
      if (!activando) return { ...prev, mismoPrecioVenta: false };

      const primerPrecioPorProducto = new Map();
      prev.items.forEach((it) => {
        if (it.id_producto && it.precio_venta !== "" && it.precio_venta !== null && !primerPrecioPorProducto.has(it.id_producto)) {
          primerPrecioPorProducto.set(it.id_producto, it.precio_venta);
        }
      });
      const items = prev.items.map((it) => {
        if (it.id_producto && primerPrecioPorProducto.has(it.id_producto)) {
          return { ...it, precio_venta: primerPrecioPorProducto.get(it.id_producto) };
        }
        return it;
      });
      return { ...prev, mismoPrecioVenta: true, items };
    });
  };

  const subtotal = form.items.reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0;
    const precio = Number(it.precio_unitario) || 0;
    return acc + (cant * precio);
  }, 0);
  const totalCompra = subtotal - (Number(form.descuento) || 0);

  const validar = () => {
    const e = {};
    if (!form.id_proveedor) e.id_proveedor = "El proveedor es obligatorio";
    const msgFecha = errorFecha(form.fecha);
    if (msgFecha) e.fecha = msgFecha;
    form.items.forEach((it, i) => {
      if (!it.id_producto) e[`item_${i}_producto`] = "Selecciona un producto";
      const producto = productos.find((p) => String(p.id_producto) === String(it.id_producto));
      const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
      if (variantesActivas.length > 0 && !it.id_variante) e[`item_${i}_variante`] = "Selecciona talla y color";
      const msgCantidad = errorItemCantidad(it.cantidad);
      if (msgCantidad) e[`item_${i}_cantidad`] = msgCantidad;
      const msgPrecio = errorItemPrecio(it.precio_unitario);
      if (msgPrecio) e[`item_${i}_precio`] = msgPrecio;
      const msgPrecioVenta = errorItemPrecioVenta(it.precio_venta);
      if (msgPrecioVenta) e[`item_${i}_precio_venta`] = msgPrecioVenta;
    });
    const msgDescGeneral = errorDescuentoGeneral(form.descuento, subtotal);
    if (msgDescGeneral) e.descuento = msgDescGeneral;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        id_proveedor: Number(form.id_proveedor),
        numero_orden: form.numero_orden || null,
        descuento: Number(form.descuento) || 0,
        estado: form.estado,
        fecha: form.fecha,
        observaciones: form.observaciones || null,
        items: form.items.map((it) => ({
          id_producto: Number(it.id_producto),
          id_variante: it.id_variante ? Number(it.id_variante) : null,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          precio_venta: Number(it.precio_venta),
        })),
      };
      await api.post("/compras", payload);
      setModal(false);
      setForm(formInicial());
      cargarCompras();
      showToast("exito", "Compra registrada correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al registrar la compra");
    } finally {
      setGuardando(false);
    }
  };

  const abrirDetalle = (c) => {
    setVerDetalle(c);
    setEstadoEditado(c.estado);
    setModoEdicion(false);
  };

  const abrirEdicion = (c) => {
    setVerDetalle(c);
    setEstadoEditado(c.estado);
    setModoEdicion(true);
  };

  const cerrarDetalle = () => {
    setVerDetalle(null);
    setModoEdicion(false);
  };

  // ── Cambio de estado directo desde el dropdown de la tabla ──
  const cambiarEstadoDesdeTabla = async (id, estado) => {
    // ── NUEVO: anular es irreversible y antes no pedía ninguna
    // confirmación real (la función "anularCompra" que sí la tenía nunca se
    // llamaba desde el desplegable de la tabla). Ahora sí se confirma, y el
    // mensaje dice específicamente CUÁL compra se va a anular — no un
    // genérico "¿Anular este registro?". ──
    if (estado === 'Anulado') {
      const compra = compras.find((c) => c.id_compra === id);
      const referencia = compra ? `C-${String(compra.id_compra).padStart(3, "0")} (${compra.proveedor})` : "esta compra";
      const ok = await confirmar({
        title: "Anular compra",
        message: `¿Anular la compra ${referencia}? Esta acción no se puede deshacer.`,
        confirmLabel: "Sí, anular",
      });
      if (!ok) return;
    }

    setCambiandoEstadoTabla(true);
    try {
      if (estado === 'Anulado') {
        await api.patch(`/compras/${id}/anular`);
      } else {
        await api.patch(`/compras/${id}/estado`, { estado });
      }
      setCompras((prev) => prev.map((c) => (c.id_compra === id ? { ...c, estado } : c)));
      showToast("exito", `Compra marcada como "${estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al cambiar el estado de la compra");
    } finally {
      setCambiandoEstadoTabla(false);
    }
  };

  const anularCompra = async (id) => {
    const compra = compras.find((c) => c.id_compra === id);
    const referencia = compra ? `C-${String(compra.id_compra).padStart(3, "0")} (${compra.proveedor})` : "esta compra";
    const ok = await confirmar({ title: "Anular compra", message: `¿Anular la compra ${referencia}? Esta acción no se puede deshacer.`, confirmLabel: "Sí, anular" });
    if (!ok) return;
    try {
      await api.patch(`/compras/${id}/anular`);
      setCompras((prev) => prev.map((c) => (c.id_compra === id ? { ...c, estado: "Anulado" } : c)));
      showToast("exito", "Compra anulada correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al anular la compra");
    }
  };

  // ── Guardar estado desde el modal de detalle: ahora cierra toda la ventana ──
  const guardarEstado = async () => {
    setGuardandoEstado(true);
    try {
      const res = await api.patch(`/compras/${verDetalle.id_compra}/estado`, { estado: estadoEditado });
      setCompras((prev) => prev.map((c) => (c.id_compra === verDetalle.id_compra ? { ...c, estado: res.data.estado } : c)));
      cerrarDetalle();
      showToast("exito", `Compra marcada como "${res.data.estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al actualizar el estado de la compra");
    } finally {
      setGuardandoEstado(false);
    }
  };

  return {
    tienePerm,
    compras, proveedores, productos, cargando, error,
    busqueda, setBusqueda, busquedaDebounced, pagina, setPagina, totalCompras,
    modal, setModal, guardando, verDetalle, modoEdicion, setModoEdicion,
    estadoEditado, setEstadoEditado, guardandoEstado, form, setForm, errores, setErrores,
    filaAbierta, setFilaAbierta, cambiandoEstadoTabla,
    totalPaginas, actualizarItem, agregarItem, quitarItem, toggleMismoPrecio,
    subtotal, totalCompra, guardar, abrirDetalle, abrirEdicion, cerrarDetalle,
    cambiarEstadoDesdeTabla, anularCompra, guardarEstado,
  };
}
