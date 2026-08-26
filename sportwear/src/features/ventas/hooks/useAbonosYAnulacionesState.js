import { useState } from "react";
import api from "../../../shared/services/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import { HOY_ISO } from "../utils/pedidosVentasHelpers";

/**
 * useAbonosYAnulacionesState
 *
 * Los dos flujos que actúan sobre una venta YA existente, disparados desde
 * la tabla de ventas pero con su propio modal y validación — separados del
 * alta de una venta (useVentasState) porque son operaciones distintas sobre
 * un registro ya creado, no variaciones del formulario de creación.
 *
 * Recibe `cargar` (recarga el listado de ventas) y el flag `cambiandoEstado`
 * de useVentasState porque ambos flujos terminan afectando esa misma tabla
 * y comparten el mismo indicador de "operación en curso" que deshabilita
 * las acciones de fila mientras se confirma un cambio de estado.
 */
export function useAbonosYAnulacionesState({ cargar, setCambiandoEstado }) {
  const showToast = useToast();

  const [abonosModal, setAbonosModal] = useState(null);
  const [formAbono,   setFormAbono]   = useState({ monto: "", metodo: "Efectivo", fecha: "" });
  const [erroresAbono, setErroresAbono] = useState({ monto: "", fecha: "" });
  const [guardandoAbono, setGuardandoAbono] = useState(false);
  // ── NUEVO: anular una venta ahora exige un motivo — se pide en un modal
  // con textarea obligatorio antes de mandar la petición. ──
  const [modalAnular, setModalAnular] = useState(null); // venta a anular, o null
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  // Punto de entrada para el caso "Anulado" del dropdown de estado de la
  // tabla — el orquestador lo invoca en vez de mandar la petición directo.
  const abrirModalAnular = (venta) => {
    setMotivoAnulacion("");
    setModalAnular(venta);
  };

  const confirmarAnularVenta = async () => {
    if (!modalAnular || !motivoAnulacion.trim()) return;
    setCambiandoEstado(true);
    try {
      await api.patch(`/ventas/${modalAnular.id_venta}/estado`, { estado: "Anulado", motivo_anulacion: motivoAnulacion.trim() });
      await cargar(true);
      showToast("exito", "Venta anulada correctamente.");
      setModalAnular(null);
      setMotivoAnulacion("");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al anular la venta");
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

  return {
    abonosModal, setAbonosModal, formAbono, setFormAbono, erroresAbono, setErroresAbono, guardandoAbono,
    modalAnular, setModalAnular, motivoAnulacion, setMotivoAnulacion,
    abrirModalAnular, confirmarAnularVenta, agregarAbono,
  };
}
