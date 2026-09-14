import { useState } from "react";
import { MAX_MONTO, MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import GaleriaImagenes from "../../../../shared/components/GaleriaImagenes";
import GestVariantes from "../GestVariantes";
import Select from "../../../../shared/components/Select";
import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconAlertTriangle, IconX } from "../../../../shared/components/Icons";
import { IconPalette } from "../../../../shared/components/galeria-imagenes/icons";

// variante="modal" (por defecto): overlay centrado, usado al crear un producto.
// variante="panel": se acopla al lado de la tabla, usado al editar un
// producto existente — mismos campos y validaciones, solo cambia el
// cascarón visual (igual que ProveedorFormModal/UsuarioFormModal).
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
  guardar, guardando, variante = 'modal',
}) {
  // ── Sugerencia de colores detectados automáticamente en la primera foto
  // subida (ver GaleriaImagenes + colorDetection.js). Se reenvía a
  // GestVariantes, que pre-marca esos colores en su propio selector —
  // ambos son hermanos dentro de este formulario y no comparten estado. ──
  const [coloresSugeridos, setColoresSugeridos] = useState([]);
  const [principalesSugeridos, setPrincipalesSugeridos] = useState([]);
  const [sugerenciaVersion, setSugerenciaVersion] = useState(0);

  const handleColoresDetectados = (colores, idsPrincipales) => {
    setColoresSugeridos(colores);
    setPrincipalesSugeridos(idsPrincipales);
    setSugerenciaVersion(v => v + 1);
  };

  const cuerpo = (
    <>
      {errores.general && <div className="gestproductos-error-banner"><IconAlertTriangle /> {errores.general}</div>}

      <div className="gestproductos-factura-seccion">
            <div className="gestproductos-seccion-header">
              <h3 className="gestproductos-factura-titulo">01. Datos del producto</h3>
              <span className="gestproductos-required-note">Campos requeridos <span className="gestproductos-required">*</span></span>
            </div>

            <div className="gestproductos-nombre-publicar-row">
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Nombre de la prenda <span className="gestproductos-required">*</span></label>
                <input className={`gestproductos-form-input${errores.nombre ? " input-error" : ""}`} placeholder="Ej: Camiseta Deportiva Performance Pro" value={form.nombre}
                  maxLength={MAX_LONGITUD_NOMBRE}
                  onChange={e => {
                    const nombre = e.target.value;
                    setForm({ ...form, nombre });
                    if (errores.nombre) setErrores(p => ({ ...p, nombre: validarNombreProducto(nombre) }));
                  }}
                  onBlur={() => setErrores(p => ({ ...p, nombre: validarNombreProducto(form.nombre) }))} />
                {errores.nombre
                  ? <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.nombre}</p>
                  : <p className="gestproductos-form-hint">Aparecerá en el encabezado de la ficha técnica y etiquetas térmicas.</p>}
              </div>

              {tienePerm('Productos.publicar') && (
                <div className="gestproductos-publicar-card">
                  <span className="gestproductos-publicar-titulo">Publicar en catálogo</span>
                  <label className={`gestproductos-switch${form.estado === "Inactivo" ? " disabled" : ""}`}>
                    <input type="checkbox" checked={!!form.publicado} disabled={form.estado === "Inactivo"}
                      onChange={e => setForm({ ...form, publicado: e.target.checked })} />
                    <span className="gestproductos-switch-track"><span className="gestproductos-switch-thumb" /></span>
                    <span className="gestproductos-switch-label">
                      {form.estado === "Inactivo" ? "No puede publicarse si está inactivo" : (form.publicado ? "Visible al público" : "No publicado")}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="gestproductos-form-grid">
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Categoría principal <span className="gestproductos-required">*</span></label>
                <Select className={`gestproductos-form-select${errores.id_categoria ? " input-error" : ""}`} value={form.id_categoria}
                  onChange={e => {
                    const id_categoria = Number(e.target.value);
                    setForm({ ...form, id_categoria });
                    if (errores.id_categoria) setErrores(p => ({ ...p, id_categoria: id_categoria ? "" : p.id_categoria }));
                  }}
                  onBlur={() => setErrores(p => ({ ...p, id_categoria: form.id_categoria ? "" : "Selecciona una categoría." }))}>
                  <option value="">— Seleccionar —</option>
                  {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </Select>
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

              {editar && (
                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Estado</label>
                  <Select className="gestproductos-form-select" value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value, publicado: e.target.value === "Inactivo" ? false : form.publicado })}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </Select>
                </div>
              )}

              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Destacar como <span className="gestproductos-optional">(opcional)</span></label>
                <div className="gestproductos-segmented">
                  {[{ v: "", t: "Ninguno" }, { v: "Nuevo", t: "Nuevo" }, { v: "Promocion", t: "Promoción" }].map(opt => (
                    <button type="button" key={opt.v || "ninguno"}
                      className={`gestproductos-segmented-btn${form.destacado === opt.v ? " active" : ""}`}
                      onClick={() => setForm({ ...form, destacado: opt.v })}>
                      {opt.t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!editar && (
              <div className="gestproductos-aviso-stock">
                <IconAlertTriangle />
                <span><strong>Sincronización de costos y existencias:</strong> el inventario inicial y los precios base se
                consolidan automáticamente al recibir la orden de compra en el módulo de <strong>Compras</strong>. En esta
                vista únicamente creas el catálogo maestro de referencias.</span>
              </div>
            )}
          </div>

          <div className="gestproductos-factura-seccion">
            {editar && <h3 className="gestproductos-factura-titulo">02. Variantes</h3>}
            <GestVariantes
              idProducto={editar || productoId} estadoProducto={form.estado} onPendingChange={setPendingVariantes}
              coloresAPurgar={coloresAPurgar} onColoresPurgados={onColoresPurgados}
              imagenesPendientes={pendingImagenes} onEliminarFotosDeColor={eliminarFotosDeColor}
              onVariantesChange={() => setVariantesVersion(v => v + 1)}
              coloresSugeridos={coloresSugeridos} principalesSugeridos={principalesSugeridos} sugerenciaVersion={sugerenciaVersion}
            />
          </div>

      <div className="gestproductos-factura-seccion">
        {editar ? (
          <>
            <h3 className="gestproductos-factura-titulo">03. Imágenes</h3>
            <div className="gestproductos-aviso-stock" style={{ marginBottom: 14 }}>
              <IconPalette />
              Sube una foto de la prenda y el sistema detectará su color automáticamente para sugerirlo en
              Variantes, o si prefieres, elige tú mismo los colores desde ahí — cualquiera de las dos formas
              queda igual de editable antes de guardar.
            </div>
          </>
        ) : (
          <>
            <div className="gestproductos-seccion-header">
              <h3 className="gestproductos-factura-titulo">03. Galería de imágenes &amp; color IA</h3>
              <span className="gestproductos-required-note">Mínimo 1 fotografía por variante para publicar</span>
            </div>
            <div className="gestproductos-asistente-ia">
              <span className="gestproductos-asistente-icono"><IconPalette /></span>
              <div className="gestproductos-asistente-texto">
                <p className="gestproductos-asistente-titulo">
                  Asistente inteligente cromático <span className="gestproductos-badge-ia">IA activa</span>
                </p>
                <p>
                  Sube la fotografía de la prenda: el motor identificará los tonos dominantes sugiriendo
                  automáticamente la variante de color vinculada, para optimizar los tiempos de carga en catálogo.
                </p>
              </div>
            </div>
          </>
        )}
        <GaleriaImagenes
          tipoReferencia="Producto" idReferencia={productoId} onPendingChange={setPendingImagenes} coloresPendientes={coloresPendientes}
          coloresAPurgar={coloresAPurgarFotos} onColoresPurgados={onFotosDeColorPurgadas}
          refrescarColores={variantesVersion}
          onColoresDetectados={handleColoresDetectados}
        />
      </div>
    </>
  );

  if (variante === 'panel') {
    return (
      <DetallePanel
        iniciales={getInitials(form.nombre) || '?'}
        avatarColor={getAvatarColor(editar)}
        nombre={editar ? "Editar producto" : "Nuevo producto"}
        subtitulo={form.nombre || undefined}
        onClose={() => !guardando && cerrarModal()}
        footer={
          <>
            <button className="detalle-panel-btn-secundario" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
            <button className="detalle-panel-btn-primario" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : (editar ? "Actualizar" : "Registrar")}
            </button>
          </>
        }
      >
        {cuerpo}
      </DetallePanel>
    );
  }

  return (
    <div className="gestproductos-modal-overlay" onClick={cerrarModal}>
      <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <h2 className="gestproductos-modal-title">{editar ? "Editar producto" : "Nuevo producto"}</h2>
          <button className="gestproductos-modal-close" onClick={cerrarModal}><IconX /></button>
        </div>

        <div className="gestproductos-modal-body gestproductos-factura-body">
          {cuerpo}
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
