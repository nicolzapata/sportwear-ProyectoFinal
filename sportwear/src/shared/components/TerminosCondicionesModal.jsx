import { createPortal } from "react-dom";
import { IconX } from "./Icons";
import "./TerminosCondiciones.css";

// ── NUEVO: contenido de los términos y condiciones — un solo lugar para
// no repetir el texto en cada pantalla que lo enlaza (Checkout, pago de un
// pedido). Se muestra dentro de un modal ("ventana" dentro de la misma
// página), nunca como una pestaña/URL nueva. ──
export default function TerminosCondicionesModal({ onClose }) {
  return createPortal(
    <div className="tyc-overlay" onClick={onClose}>
      <div className="tyc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tyc-header">
          <h2 className="tyc-title">Términos y condiciones</h2>
          <button className="tyc-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="tyc-body">
          <p className="tyc-fecha">Última actualización: 2026</p>

          <h3>1. Aceptación</h3>
          <p>
            Al registrar un pedido o realizar un pago en DVNA SportWear aceptas
            los términos descritos a continuación. Si no estás de acuerdo con
            alguno de ellos, por favor no confirmes tu pedido ni tu pago.
          </p>

          <h3>2. Pedidos ya confirmados</h3>
          <p>
            <b>Una vez confirmado un pedido, no es posible eliminar productos
            de él.</b> Si necesitas hacer un cambio, comunícate con nuestro
            equipo de atención al cliente antes de que el pedido pase a
            estado "En preparación" — después de ese punto el pedido ya no
            admite modificaciones. Cancelar el pedido completo sí sigue
            siendo posible mientras no haya sido entregado, sujeto a las
            condiciones de la sección 4.
          </p>

          <h3>3. Precios y pagos</h3>
          <p>
            Los precios se muestran en pesos colombianos (COP) e incluyen los
            impuestos aplicables. Cuando el pago se realiza a cuotas, el
            cliente se compromete a pagar cada cuota en la fecha de
            vencimiento indicada; el incumplimiento puede afectar la entrega
            de pedidos futuros a cuotas. El monto de una cuota o abono nunca
            se reduce una vez generado.
          </p>

          <h3>4. Cancelaciones y devoluciones</h3>
          <p>
            Un pedido puede cancelarse siempre que su estado de envío sea
            "Pendiente" o "En preparación". Una vez marcado como "Enviado" o
            "Entregado", la cancelación ya no es posible desde la plataforma;
            cualquier reclamo sobre el producto recibido debe gestionarse
            directamente con nuestro equipo de atención al cliente dentro de
            los cinco (5) días hábiles siguientes a la entrega.
          </p>

          <h3>5. Envíos</h3>
          <p>
            Actualmente realizamos domicilios únicamente dentro de Medellín.
            El tiempo de entrega estimado se comunicará al confirmar el
            pedido y puede variar según la disponibilidad de inventario y la
            zona de entrega.
          </p>

          <h3>6. Datos personales</h3>
          <p>
            La información personal suministrada (nombre, documento,
            dirección, contacto) se usa exclusivamente para procesar el
            pedido, gestionar el pago y coordinar la entrega, y no se
            comparte con terceros ajenos a ese propósito.
          </p>

          <h3>7. Contacto</h3>
          <p>
            Ante cualquier duda sobre estos términos, puedes escribirnos a
            través de los canales de atención publicados en el sitio.
          </p>
        </div>
        <div className="tyc-footer">
          <button className="tyc-btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
