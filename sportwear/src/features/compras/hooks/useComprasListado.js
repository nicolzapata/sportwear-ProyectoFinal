import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useConfirm } from "../../../shared/contexts/ConfirmContext";
import { FILAS_POR_PAGINA } from "../utils/comprasHelpers";

/**
 * useComprasListado
 *
 * Listado/filtro de compras (ComprasTable) y el modal de detalle
 * (CompraDetalleModal), incluyendo el cambio/anulación de estado desde la
 * tabla — separado del formulario de alta (useNuevaCompraState), al que
 * solo le expone `cargarCompras` para refrescar tras registrar una compra.
 */
export function useComprasListado() {
  const showToast = useToast();
  const confirmar = useConfirm();

  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalCompras, setTotalCompras] = useState(0);
  const [verDetalle, setVerDetalle] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoEditado, setEstadoEditado] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
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

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarCompras(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalCompras / FILAS_POR_PAGINA) || 1;

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
    compras, cargando, error,
    busqueda, setBusqueda, busquedaDebounced, pagina, setPagina, totalCompras,
    verDetalle, modoEdicion, setModoEdicion, estadoEditado, setEstadoEditado, guardandoEstado,
    filaAbierta, setFilaAbierta, cambiandoEstadoTabla,
    totalPaginas, cargarCompras, abrirDetalle, abrirEdicion, cerrarDetalle,
    cambiarEstadoDesdeTabla, anularCompra, guardarEstado,
  };
}
