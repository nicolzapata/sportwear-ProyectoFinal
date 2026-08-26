import { useAuth } from "../../../shared/contexts/AuthContext";
import { useVentasListado } from "./useVentasListado";
import { useAltaVentaState } from "./useAltaVentaState";
import { useAbonosYAnulacionesState } from "./useAbonosYAnulacionesState";

/**
 * usePedidosVentas
 *
 * Orquestador liviano de la página PedidosVentas: compone el listado
 * (useVentasListado), el alta de venta (useAltaVentaState) y los flujos de
 * abono/anulación (useAbonosYAnulacionesState), y resuelve el único punto
 * de cruce entre ellos — el dropdown de estado de la tabla, que para
 * "Anulado" debe abrir el modal de motivo en vez de mandar la petición
 * directo.
 */
export function usePedidosVentas() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const ventasListado = useVentasListado();
  const altaVenta = useAltaVentaState({ cargar: ventasListado.cargar });
  const abonosYAnulaciones = useAbonosYAnulacionesState({
    cargar: ventasListado.cargar,
    setCambiandoEstado: ventasListado.setCambiandoEstado,
  });

  // ── NUEVO: anular una venta exige un motivo — en vez de mandar la
  // petición de una vez, se abre un modal a pedirlo. ──
  const cambiarEstado = (id, estado) => {
    if (estado === "Anulado") {
      const venta = ventasListado.datos.find((v) => v.id_venta === id);
      abonosYAnulaciones.abrirModalAnular(venta || { id_venta: id });
      return;
    }
    ventasListado.cambiarEstadoDirecto(id, estado);
  };

  return {
    tienePerm,
    ...ventasListado,
    ...altaVenta,
    ...abonosYAnulaciones,
    cambiarEstado,
  };
}
