import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import {
  nuevoItem, formInicial,
  errorFecha, errorItemCantidad,
  errorItemPrecio, errorItemPrecioVenta, errorDescuentoGeneral,
} from "../utils/comprasHelpers";

/**
 * useNuevaCompraState
 *
 * Formulario de alta de una compra (NuevaCompraModal): selección de
 * proveedor/productos, líneas de ítems, el interruptor "mismo precio de
 * venta", validación y guardado — separado del listado
 * (useComprasListado), al que solo le pide `cargarCompras` para refrescar
 * la tabla tras registrar la compra.
 */
export function useNuevaCompraState({ cargarCompras }) {
  const showToast = useToast();

  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(formInicial());
  const [errores, setErrores] = useState({});

  useEffect(() => {
    api.get("/proveedores").then(({ data }) => setProveedores(data)).catch(() => {});
    api.get("/productos").then(({ data }) => setProductos((data || []).filter((p) => p.estado === "Activo"))).catch(() => {});
  }, []);

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

  return {
    proveedores, productos, modal, setModal, guardando, form, setForm, errores, setErrores,
    actualizarItem, agregarItem, quitarItem, toggleMismoPrecio,
    subtotal, totalCompra, guardar,
  };
}
