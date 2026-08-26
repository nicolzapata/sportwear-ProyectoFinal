import { useAuth } from "../../../shared/contexts/AuthContext";
import { useComprasListado } from "./useComprasListado";
import { useNuevaCompraState } from "./useNuevaCompraState";

/**
 * useCompras
 *
 * Orquestador liviano de la página Compras: compone el listado
 * (useComprasListado) con el formulario de alta (useNuevaCompraState), a
 * quien solo le pasa `cargarCompras` para refrescar la tabla tras
 * registrar una compra nueva — ambos dominios no comparten más estado.
 */
export function useCompras() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const comprasListado = useComprasListado();
  const nuevaCompra = useNuevaCompraState({ cargarCompras: comprasListado.cargarCompras });

  return {
    tienePerm,
    ...comprasListado,
    ...nuevaCompra,
  };
}
