// src/pages/productos/GestProductos.jsx
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Loader from "../../../shared/components/Loader";
import GestProductosToolbar from "../components/gest-productos/GestProductosToolbar";
import ProductosFiltros from "../components/gest-productos/ProductosFiltros";
import ProductosTable from "../components/gest-productos/ProductosTable";
import ProductosGrid from "../components/gest-productos/ProductosGrid";
import CategoriasTable from "../components/gest-productos/CategoriasTable";
import ColoresGrid from "../components/gest-productos/ColoresGrid";
import ProductoFormModal from "../components/gest-productos/ProductoFormModal";
import CategoriaFormModal from "../components/gest-productos/CategoriaFormModal";
import ColorFormModal from "../components/gest-productos/ColorFormModal";
import ProductoDetalleModal from "../components/gest-productos/ProductoDetalleModal";
import CategoriaDetalleModal from "../components/gest-productos/CategoriaDetalleModal";
import { useGestProductos } from "../hooks/useGestProductos";
// GestProductos.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import "./GestProductos.layout.css";
import "./GestProductos.modals.css";
import "./GestProductos.tabla.css";
import "./GestProductos.colores.css";
import "./GestProductos.grid.css";
// Reutiliza los estilos del selector de color / vista previa (picker, preview) tal
// cual como en la antigua página de Colores — evita duplicar esas reglas acá.
// Colores.css también se dividió por sección; se importan los 3 archivos en el
// mismo orden para preservar la cascada.
import "./Colores.layout.css";
import "./Colores.modals.css";
import "./Colores.responsive.css";

export default function GestProductos() {
  const g = useGestProductos();

  if (g.loading) return <Loader text="Cargando productos..." />;

  // "Ver detalle" se muestra como ventana sobrepuesta sobre la tabla; crear
  // y editar un producto comparten el mismo modal centrado (ver más abajo).
  const panelAbierto = g.tab === 'productos' && !!g.verDetalle;

  return (
    <div className="gestproductos-container">
      <GestProductosToolbar g={g} />

      {g.tab === 'productos' && (
        <ProductosFiltros
          categorias={g.categorias}
          filtroCategoria={g.filtroCategoria} setFiltroCategoria={g.setFiltroCategoria}
          filtroBajoStock={g.filtroBajoStock} setFiltroBajoStock={g.setFiltroBajoStock}
        />
      )}

      {g.tab === 'productos' ? (
        <div className="gestproductos-contenido">
          {g.vistaGrid ? (
            <ProductosGrid
              datos={g.datos} tienePerm={g.tienePerm}
              abrirDetalle={g.abrirDetalle} abrirEditar={g.abrirEditar} setEliminarId={g.setEliminarId}
              totalPaginasProductos={g.totalPaginasProductos} paginaProductos={g.paginaProductos} setPaginaProductos={g.setPaginaProductos} totalProductos={g.totalProductos}
            />
          ) : (
            <ProductosTable
              datos={g.datos} tienePerm={g.tienePerm}
              variantesDropdownAbierto={g.variantesDropdownAbierto} setVariantesDropdownAbierto={g.setVariantesDropdownAbierto}
              togglePublicado={g.togglePublicado} toggleEstadoProducto={g.toggleEstadoProducto}
              abrirDetalle={g.abrirDetalle} abrirEditar={g.abrirEditar} setEliminarId={g.setEliminarId}
              totalPaginasProductos={g.totalPaginasProductos} paginaProductos={g.paginaProductos} setPaginaProductos={g.setPaginaProductos} totalProductos={g.totalProductos}
            />
          )}
          {panelAbierto && (
            <div className="gestproductos-panel-columna">
              <ProductoDetalleModal verDetalle={g.verDetalle} setVerDetalle={g.setVerDetalle} tienePerm={g.tienePerm} abrirEditar={g.abrirEditar} />
            </div>
          )}
        </div>
      ) : g.tab === 'categorias' ? (
        <CategoriasTable
          categoriasPagina={g.categoriasPagina} tienePerm={g.tienePerm}
          ordenCategorias={g.ordenCategorias} setOrdenCategorias={g.setOrdenCategorias}
          abrirDetalleCategoria={g.abrirDetalleCategoria} abrirEditarCategoria={g.abrirEditarCategoria} cambiarEstadoCategoria={g.cambiarEstadoCategoria}
          totalPaginasCategorias={g.totalPaginasCategorias} paginaCategorias={g.paginaCategorias} setPaginaCategorias={g.setPaginaCategorias} totalCategorias={g.totalCategorias}
        />
      ) : (
        <ColoresGrid
          coloresTodos={g.coloresTodos} productos={g.productosDeColores} busqueda={g.busqueda} tienePerm={g.tienePerm}
          cambiarEstadoColor={g.cambiarEstadoColor} abrirEditarColor={g.abrirEditarColor} setEliminarColorId={g.setEliminarColorId}
        />
      )}

      {/* ── Modal centrado — mismo cascarón tanto para crear como para editar
          un producto, así "Editar" se ve igual que "Nuevo producto". ── */}
      {g.modal && g.tab === 'productos' && (
        <ProductoFormModal
          editar={g.editar} productoId={g.productoId} cerrarModal={g.cerrarModal}
          errores={g.errores} setErrores={g.setErrores} form={g.form} setForm={g.setForm} validarNombreProducto={g.validarNombreProducto}
          categorias={g.categorias} tienePerm={g.tienePerm}
          setPendingVariantes={g.setPendingVariantes}
          pendingImagenes={g.pendingImagenes} setPendingImagenes={g.setPendingImagenes}
          coloresAPurgar={g.coloresAPurgar} onColoresPurgados={g.onColoresPurgados}
          coloresAPurgarFotos={g.coloresAPurgarFotos} onFotosDeColorPurgadas={g.onFotosDeColorPurgadas}
          eliminarFotosDeColor={g.eliminarFotosDeColor} variantesVersion={g.variantesVersion} setVariantesVersion={g.setVariantesVersion}
          coloresPendientes={g.coloresPendientes}
          guardar={g.guardar} guardando={g.guardando}
        />
      )}

      {/* ── Modal crear/editar categoría — panel único, mismo estilo que
          "Nuevo producto" (antes usaba el wizard ModalSteps con "Paso 1 de 1",
          visualmente distinto al resto). ── */}
      {g.modal && g.tab === 'categorias' && (
        <CategoriaFormModal
          editarCategoria={g.editarCategoria} setModal={g.setModal}
          formCategoria={g.formCategoria} setFormCategoria={g.setFormCategoria}
          erroresCategoria={g.erroresCategoria} setErroresCategoria={g.setErroresCategoria} validarNombreCategoria={g.validarNombreCategoria}
          guardarCategoria={g.guardarCategoria}
        />
      )}

      {/* ── Modal crear/editar color — mismo criterio: panel único, no wizard. ── */}
      {g.modal && g.tab === 'colores' && (
        <ColorFormModal
          editarColor={g.editarColor} setModal={g.setModal}
          formColor={g.formColor} setFormColor={g.setFormColor}
          erroresColor={g.erroresColor} setErroresColor={g.setErroresColor} mensajeErrorNombreColor={g.mensajeErrorNombreColor}
          guardarColor={g.guardarColor}
        />
      )}

      {g.eliminarColorId && (
        <ConfirmModal
          title="Eliminar color"
          message={`¿Eliminar el color "${g.coloresTodos.find((c) => c.id_color === g.eliminarColorId)?.nombre || ""}"? No se podrá eliminar si está asociado a algún producto.`}
          onCancel={() => g.setEliminarColorId(null)}
          onConfirm={g.confirmarEliminarColor}
          confirmLabel="Sí, eliminar"
        />
      )}

      {/* ── Modal ver detalle de categoría: mismo panel tipo factura ── */}
      <CategoriaDetalleModal verDetalleCategoria={g.verDetalleCategoria} setVerDetalleCategoria={g.setVerDetalleCategoria} tienePerm={g.tienePerm} abrirEditarCategoria={g.abrirEditarCategoria} />

      {g.eliminarId && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Seguro que deseas eliminar "${g.datos.find((p) => p.id_producto === g.eliminarId)?.nombre || "este producto"}"? Dejará de mostrarse en el catálogo y en la gestión de productos. No se puede eliminar si tiene pedidos pendientes.`}
          confirmLabel="Sí, eliminar"
          onConfirm={g.confirmarEliminar}
          onCancel={() => g.setEliminarId(null)}
        />
      )}

      {g.coloresSinFotos.length > 0 && (
        <ConfirmModal
          title="Colores sin fotos"
          message={`Un producto no puede tener colores sin fotos asociadas. ${g.coloresSinFotos.length > 1 ? "Los siguientes colores no tienen" : "El siguiente color no tiene"} ninguna foto: ${g.coloresSinFotos.map(c => c.nombre).join(", ")}. Puedes eliminarlos para continuar o cancelar y subirles fotos.`}
          confirmLabel="Eliminar esos colores"
          onConfirm={g.confirmarEliminarColoresSinFotos}
          onCancel={() => g.setColoresSinFotos([])}
        />
      )}
    </div>
  );
}
