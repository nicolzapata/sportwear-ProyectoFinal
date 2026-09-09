// Muestra un aviso cuando la sesión anterior se cerró automáticamente por
// inactividad, permitiendo al usuario iniciar sesión de nuevo o continuar
// navegando sin autenticarse.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "../contexts/ConfirmContext";

export default function SessionExpiredNotice() {
  const navigate = useNavigate();
  const confirmar = useConfirm();

  useEffect(() => {
    const motivo = localStorage.getItem("sz_logout_motivo");
    if (motivo !== "inactividad") return;

    localStorage.removeItem("sz_logout_motivo");

    confirmar({
      title: "Sesión cerrada por inactividad",
      message: "Tu sesión se cerró automáticamente por inactividad. ¿Deseas iniciar sesión de nuevo o continuar sin iniciar sesión?",
      confirmLabel: "Iniciar sesión",
      cancelLabel: "Continuar sin iniciar sesión",
      warning: false,
    }).then((confirmado) => {
      if (confirmado) navigate("/login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
