import { MAX_MONTO, MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import GaleriaImagenes from "../../../../shared/components/GaleriaImagenes";
import GestVariantes from "../GestVariantes";
import { IconAlertTriangle, IconX } from "../../../../shared/components/Icons";

export default function ProductoFormModal({
  editar, productoId, cerrarModal,
  errores, setErrores, form, setForm, validarNombreProducto,
  categorias, tienePerm,
  setPendingVariantes,
  pendingImagenes, setPendingImagenes,
  coloresAPurgar, onColoresPurgados,
  coloresAPurgarFotos, onFotosDeColorPurgadas,
  eliminarFotosDeColor, variantesVersion, setVariantesVersion,
  coloresPendientes,
  guardar, guardando,
}) {
  return (
    <div className="gestproductos-modal-overlay" onClick={cerrarModal}>
      <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <h2 className="gestproductos-modal-title">{editar ? "Editar producto" : "Nuevo producto"}</h2>
          <button className="gestproductos-modal-close" onClick={cerrarModal}><IconX /></button>
        </div>

        <div className="gestproductos-modal-body gestproductos-factura-body">
          {errores.general && <div className="gestproductos-error-banner"><IconAlertTriangle /> {errores.general}</div>}

          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Datos del producto</h3>

            <div className="gestproductos-form-group">
              <label className="gestproductos-form-label">Nombre <span className="gestproductos-required">*</span></label>
              <input className={`gestproductos-form-input${errores.nombre ? " input-error" : ""}`} placeholder="Ej: Camiseta Deportiva" value={form.nombre}
                maxLength={MAX_LONGITUD_NOMBRE}
                onChange={e => {
                  const nombre = e.target.value;
                  setForm({ ...form, nombre });
                  if (errores.nombre) setErrores(p => ({ ...p, nombre: validarNombreProducto(nombre) }));
                }}
                onBlur={() => setErrores(p => ({ ...p, nombre: validarNombreProducto(form.nombre) }))} />
              {errores.nombre && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.nombre}</p>}
            </div>

            <div className="gestproductos-form-row">
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Categoría <span className="gestproductos-required">*</span></label>
                <select className={`gestproductos-form-select${errores.id_categoria ? " input-error" : ""}`} value={form.id_categoria}
                  onChange={e => {
                    const id_categoria = Number(e.target.value);
                    setForm({ ...form, id_categoria });
                    if (errores.id_categoria) setErrores(p => ({ ...p, id_categoria: id_categoria ? "" : p.id_categoria }));
                  }}
                  onBlur={() => setErrores(p => ({ ...p, id_categoria: form.id_categoria ? "" : "Selecciona una categoría." }))}>
                  <option value="">— Seleccionar —</option>
                  {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
                {errores.id_categoria && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.id_categoria}</p>}
              </div>

              {editar && (
                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Precio (COP)</label>
                  <input type="number" min={0} max={MAX_MONTO} className={`gestproductos-form-input${errores.precio ? " input-error" : ""}`} placeholder="0" value={form.precio}
                    onChange={e => {
                      const precio = e.target.value;
                      setForm({ ...form, precio });
                      if (errores.precio) {
                        const invalido = precio !== "" && (isNaN(Number(precio)) || Number(precio) < 0);
                        setErrores(p => ({ ...p, precio: invalido ? "El precio debe ser un número válido, mayor o igual a $0." : "" }));
                      }
                    }}
                    onBlur={() => {
                      const invalido = form.precio !== "" && (isNaN(Number(form.precio)) || Number(form.precio) < 0);
                      setErrores(p => ({ ...p, precio: invalido ? "El precio debe ser un número válido, mayor o igual a $0." : "" }));
                    }} />
                  {errores.precio && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.precio}</p>}
                </div>
              )}
            </div>

            {!editar && (
              <div className="gestproductos-aviso-stock">
                <IconAlertTriangle />
                El stock y el precio de venta de este producto se registran al hacer la primera compra
                (módulo Compras) — aquí solo defines sus datos generales y sus tallas/colores.
              </div>
            )}

            <div className="gestproductos-form-row">
              {editar && (
                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Estado</label>
                  <select className="gestproductos-form-select" value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value, publicado: e.target.value === "Inactivo" ? false : form.publicado })}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              )}

              {tienePerm('Productos.publicar') && (
                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Publicar en catálogo</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <input type="checkbox" id="publicado" checked={!!form.publicado} disabled={form.estado === "Inactivo"}
                      onChange={e => setForm({ ...form, publicado: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: form.estado === "Inactivo" ? "not-allowed" : "pointer" }} />
                    <label htmlFor="publicado" style={{ cursor: form.estado === "Inactivo" ? "not-allowed" : "pointer", fontSize: 13, color: form.estado === "Inactivo" ? "#999" : "inherit" }}>
                      {form.estado === "Inactivo" ? "No puede publicarse si está inactivo" : (form.publicado ? "Visible en catálogo" : "No publicado")}
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="gestproductos-form-group">
              <label className="gestproductos-form-label">Destacar como <span className="gestproductos-optional">(opcional)</span></label>
              <select className="gestproductos-form-select" value={form.destacado}
                onChange={e => setForm({ ...form, destacado: e.target.value })}>
                <option value="">Ninguno</option>
                <option value="Nuevo">Nuevo</option>
                <option value="Promocion">Promoción</option>
              </select>
            </div>
          </div>

          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Variantes</h3>
            <GestVariantes
              idProducto={editar || productoId} estadoProducto={form.estado} onPendingChange={setPendingVariantes}
              coloresAPurgar={coloresAPurgar} onColoresPurgados={onColoresPurgados}
              imagenesPendientes={pendingImagenes} onEliminarFotosDeColor={eliminarFotosDeColor}
              onVariantesChange={() => setVariantesVersion(v => v + 1)}
            />
          </div>

          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Imágenes</h3>
            <GaleriaImagenes
              tipoReferencia="Producto" idReferencia={productoId} onPendingChange={setPendingImagenes} coloresPendientes={coloresPendientes}
              coloresAPurgar={coloresAPurgarFotos} onColoresPurgados={onFotosDeColorPurgadas}
              refrescarColores={variantesVersion}
            />
          </div>
        </div>

        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
          <button className="gestproductos-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : (editar ? "Actualizar" : "Registrar")}
          </button>
        </div>
      </div>
    </div>
  );
}
