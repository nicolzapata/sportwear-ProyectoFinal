import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconX } from "../../../../shared/components/Icons";
import { fmt } from "../../utils/pagosAbonosHelpers";

export default function PagoDetalleModal({ verDetalle, setVerDetalle }) {
  if (!verDetalle) return null;

  return (
    <div className="pagosabonos-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="pagosabonos-modal pagosabonos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="pagosabonos-modal-header">
          <div>
            <h2 className="pagosabonos-modal-title">Pago P-{String(verDetalle.id_pago).padStart(3, "0")}</h2>
            <p className="pagosabonos-modal-subtitulo">Detalle del pago</p>
          </div>
          <button className="pagosabonos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="pagosabonos-modal-body pagosabonos-factura-body">
          <div className="pagosabonos-factura-seccion">
            <h3 className="pagosabonos-factura-titulo">Información</h3>
            <DetalleGrid>
              <DetalleItem label="ID" value={`P-${String(verDetalle.id_pago).padStart(3, "0")}`} />
              <DetalleItem label="Venta" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Tipo" value={verDetalle.tipo} />
              <DetalleItem label="Método" value={verDetalle.metodo} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
            </DetalleGrid>
          </div>

          <div className="pagosabonos-factura-seccion">
            <h3 className="pagosabonos-factura-titulo">Pago</h3>
            <DetalleGrid>
              <DetalleItem label="Monto" value={fmt(verDetalle.monto)} />
              <DetalleItem label="Estado" value={
                <span className={`pagosabonos-estado-badge-static pagosabonos-estado-${
                  verDetalle.estado === 'Confirmado' ? 'exito' : verDetalle.estado === 'Anulado' ? 'error' : 'pendiente'
                }`}>{verDetalle.estado}</span>
              } />
            </DetalleGrid>
          </div>
        </div>

        <div className="pagosabonos-modal-footer">
          <button className="pagosabonos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
