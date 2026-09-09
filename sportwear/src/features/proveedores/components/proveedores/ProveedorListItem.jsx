import { PALETAS, inicialesProveedor } from "../../utils/proveedoresHelpers";
import { IconChevronRight } from "../../../../shared/components/Icons";

export default function ProveedorListItem({ proveedor, index, seleccionado, onSeleccionar }) {
  const color = PALETAS[index % PALETAS.length];
  const activo = proveedor.estado === 'Activo';
  const totalCompras = Number(proveedor.total_compras) || 0;

  return (
    <button
      type="button"
      className={`prov-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(proveedor.id_proveedor)}
    >
      <div className="prov-item-top">
        <span className="prov-item-icon" style={{ background: color }}>{inicialesProveedor(proveedor)}</span>
        <div className="prov-item-info">
          <div className="prov-item-nombre-row">
            <span className="prov-item-nombre">{proveedor.razon_social}</span>
            <span className="prov-item-badge">{proveedor.tipo_doc} {proveedor.numero_doc}</span>
          </div>
          {proveedor.nombre_comercial && <p className="prov-item-desc">{proveedor.nombre_comercial}</p>}
        </div>
        <span className="prov-item-ver">
          {seleccionado ? 'Viendo detalle' : 'Ver detalle'}
          <IconChevronRight />
        </span>
      </div>
      <div className="prov-item-bottom">
        <span className={`prov-item-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          {proveedor.estado}
        </span>
        {proveedor.nombre_contacto && (
          <span className="prov-item-contacto">{proveedor.nombre_contacto}{proveedor.telefono_celular ? ` · ${proveedor.telefono_celular}` : ''}</span>
        )}
        {proveedor.ciudad && <span className="prov-item-ciudad">{proveedor.ciudad}</span>}
        <span className="prov-item-ordenes">{totalCompras} orden{totalCompras !== 1 ? 'es' : ''}</span>
      </div>
    </button>
  );
}
