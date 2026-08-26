import { calcularFechasVencimiento } from "../utils/pedidosVentasHelpers";

// Deriva los valores de la cuadrícula de cuotas (valor por cuota y fechas de
// vencimiento) a partir del número de cuotas elegido y el total de la venta.
export function useNuevaVenta(formVenta, totalVenta) {
  const numCuotasSel = Number(formVenta.num_cuotas) || 0;
  const valorCuotaSel = numCuotasSel > 0 ? Math.ceil(totalVenta / numCuotasSel) : 0;
  const fechaBaseCuotas = formVenta.fecha_primera_cuota || formVenta.fecha;
  const fechasCuotasSel = numCuotasSel > 0 && fechaBaseCuotas
    ? calcularFechasVencimiento(fechaBaseCuotas, numCuotasSel, totalVenta)
    : [];

  return { numCuotasSel, valorCuotaSel, fechasCuotasSel };
}
