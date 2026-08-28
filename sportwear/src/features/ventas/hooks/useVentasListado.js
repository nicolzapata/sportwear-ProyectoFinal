import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import { FILAS_POR_PAGINA } from "../utils/pedidosVentasHelpers";

/**
 * useVentasListado
 *
 * Listado/filtro de ventas y sus acciones de fila (VentasTable,
 * VentaDetalleModal, cambio de estado directo desde el dropdown) —
 * separado del formulario de alta (useAltaVentaState) y de los flujos de
 * abono/anulación (useAbonosYAnulacionesState).
 */
export function useVentasListado() {
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
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  // ── NUEVO: filtro de pestañas "Todas / Cliente / Admin" al lado del
  // buscador — mismo patrón que "Usuarios"/"Clientes" en el módulo de
  // Usuarios. Filtra según quién registró la venta: el cliente desde la
  // Landing, o el administrador directamente aquí. ──
  const [filtroOrigen, setFiltroOrigen] = useState(""); // "" = Todas | "Landing" | "Admin"
  // ── NUEVO: filtro "Realizadas" (pagadas) / "Pendientes" — "" = Todas ──
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");

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
  useEffect(() => { cargar(false, pagina, busquedaDebounced); }, [pagina, busquedaDebounced, filtroOrigen, filtroEstadoPago]);

  const cargar = async (silencioso = false, pag = pagina, q = busquedaDebounced) => {
    if (!silencioso) {
      setCargando(true);
    }
    setErrorMsg("");
    const inicio = Date.now();
    try {
      const { data } = await api.get("/ventas", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined, origen: filtroOrigen || undefined, estado_pago: filtroEstadoPago || undefined } });

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

  const totalPaginas = Math.ceil(total / FILAS_POR_PAGINA) || 1;

  // Cambio de estado directo (no-"Anulado") desde el dropdown de la tabla.
  // El caso "Anulado" lo intercepta el orquestador antes de llegar aquí,
  // porque abre el modal de motivo que vive en useAbonosYAnulacionesState.
  const cambiarEstadoDirecto = async (id, estado) => {
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

  return {
    datos, total, cargando, primerCargaHecha, errorMsg,
    busqueda, setBusqueda, pagina, setPagina,
    verDetalle, setVerDetalle, filaAbierta, setFilaAbierta,
    cambiandoEstado, setCambiandoEstado,
    filtroOrigen, setFiltroOrigen,
    filtroEstadoPago, setFiltroEstadoPago,
    totalPaginas, cargar, cambiarEstadoDirecto,
  };
}
