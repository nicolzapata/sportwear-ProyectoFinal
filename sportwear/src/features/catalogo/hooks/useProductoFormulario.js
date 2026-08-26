import { useState } from "react";
import api from "../../../shared/services/api";
import { ERRORES_INICIALES, FORM_VACIO } from "../utils/gestProductosHelpers.jsx";
import { MAX_LONGITUD_NOMBRE } from "../../../shared/utils/numerico";

/**
 * useProductoFormulario
 *
 * Formulario de alta/edición de un producto — incluye el staging de
 * variantes/imágenes pendientes y la purga de "colores sin fotos", porque
 * son parte inseparable del flujo de guardar un producto (no del listado,
 * que vive en useProductosListado).
 */
export function useProductoFormulario({ categorias, setModal, mostrarToast, recargarTodo }) {
  const [editar,           setEditar]           = useState(null);
  const [productoId,       setProductoId]       = useState(null);
  const [guardando,        setGuardando]        = useState(false);
  const [errores,          setErrores]          = useState(ERRORES_INICIALES);
  const [form,             setForm]             = useState(FORM_VACIO);
  const [pendingVariantes, setPendingVariantes] = useState([]);
  const [pendingImagenes,  setPendingImagenes]  = useState([]);
  const [coloresSinFotos,  setColoresSinFotos]  = useState([]);
  const [coloresAPurgar,   setColoresAPurgar]   = useState([]);
  const [coloresAPurgarFotos, setColoresAPurgarFotos] = useState([]);
  // Se incrementa cada vez que GestVariantes agrega/quita un color en modo
  // conectado (producto ya existente) — GaleriaImagenes lo usa como disparador
  // para refrescar su propia lista de colores disponibles para subir fotos,
  // ya que ambos componentes son hermanos y no comparten estado por su cuenta.
  const [variantesVersion, setVariantesVersion] = useState(0);

  const abrirRegistrar = () => {
    setEditar(null); setProductoId(null); setErrores(ERRORES_INICIALES);
    setForm({ ...FORM_VACIO, id_categoria: categorias[0]?.id_categoria || "" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_producto); setProductoId(p.id_producto); setErrores(ERRORES_INICIALES);
    setForm({ nombre: p.nombre ?? "", descripcion: p.descripcion ?? "", id_categoria: p.id_categoria ?? "", precio: p.precio ?? "", publicado: !!p.publicado, estado: p.estado ?? "Activo", destacado: p.destacado ?? "" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const validarNombreProducto = (valor) => {
    const texto = valor.trim();
    if (!texto) return "El nombre del producto es obligatorio.";
    if (texto.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (texto.length > MAX_LONGITUD_NOMBRE) return `No puede tener más de ${MAX_LONGITUD_NOMBRE} caracteres.`;
    return "";
  };

  const validarPasoDatos = () => {
    const e = { ...ERRORES_INICIALES }; let ok = true;
    const msgNombre = validarNombreProducto(form.nombre);
    if (msgNombre) { e.nombre = msgNombre; ok = false; }
    if (!form.id_categoria) { e.id_categoria = "Selecciona una categoría."; ok = false; }
    // ── NUEVO: el precio solo se pide al EDITAR — al crear, el producto nace
    // sin precio ni stock; ambos se definen con la primera compra que se le
    // registre (ver Compras). Y aun al editar, el precio es OPCIONAL: el valor
    // real de venta lo define Compras, así que 0 o vacío es válido aquí — solo
    // se marca error si el usuario escribió algo que no es un número válido. ──
    if (editar) {
      const val = form.precio;
      if (val !== "" && val !== null && val !== undefined && (isNaN(Number(val)) || Number(val) < 0)) {
        e.precio = "El precio debe ser un número válido, mayor o igual a $0.";
        ok = false;
      }
    }
    if (!ok) console.log("[validarPasoDatos] errores encontrados:", e);
    setErrores(e); return ok;
  };

  const validar = () => validarPasoDatos();

  // Un producto no puede tener colores sin ninguna foto asociada. Compara los
  // colores en juego (variantes existentes + pendientes) contra los colores
  // que sí tienen al menos una imagen (existente + pendiente de subir).
  const obtenerColoresSinFotos = async () => {
    let coloresEnJuego = [];
    const idsConFoto = new Set();

    if (editar) {
      try {
        const [{ data: varsData }, { data: imgsData }] = await Promise.all([
          api.get(`/variantes?id_producto=${editar}`),
          api.get(`/imagenes?tipo=Producto&id=${editar}`),
        ]);
        coloresEnJuego = varsData.filter(v => v.id_color).map(v => ({ id_color: v.id_color, nombre: v.color_nombre }));
        imgsData.forEach(i => { if (i.id_color) idsConFoto.add(String(i.id_color)); });
      } catch { return []; /* si falla la verificación, no bloqueamos el guardado */ }
    }

    pendingVariantes.forEach(v => { if (v.id_color) coloresEnJuego.push({ id_color: v.id_color, nombre: v.color_nombre }); });
    pendingImagenes.forEach(i => { if (i.id_color) idsConFoto.add(String(i.id_color)); });

    const coloresUnicos = [...new Map(coloresEnJuego.map(c => [String(c.id_color), c])).values()];
    return coloresUnicos.filter(c => !idsConFoto.has(String(c.id_color)));
  };

  // Sube las variantes y las imágenes pendientes de staging a un producto ya
  // creado — mismo procedimiento tanto si el producto se acaba de crear como
  // si ya existía y se está editando.
  const subirVariantesEImagenesPendientes = async (idProductoDestino) => {
    if (pendingVariantes.length > 0) {
      await Promise.all(pendingVariantes.map(v => api.post('/variantes', { id_producto: idProductoDestino, id_color: v.id_color, talla: v.talla, stock: v.stock || 0 })));
    }
    if (pendingImagenes.length > 0) {
      for (const img of pendingImagenes) {
        const fd = new FormData();
        fd.append("imagenes", img.file); fd.append("tipo_referencia", "Producto"); fd.append("id_referencia", idProductoDestino);
        if (img.id_color) fd.append("id_color", img.id_color);
        await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
    }
    setPendingVariantes([]); setPendingImagenes([]);
  };

  const guardarProducto = async () => {
    setGuardando(true);
    let huboExito = false;
    try {
      const payload = { nombre: form.nombre, descripcion: form.descripcion || null, id_categoria: Number(form.id_categoria), precio: editar ? Number(form.precio) : 0, publicado: !!form.publicado, estado: form.estado, destacado: form.destacado || null };

      if (editar) {
        await api.put(`/productos/${editar}`, payload);
        await subirVariantesEImagenesPendientes(editar);
        mostrarToast("exito", "Producto actualizado.");
        huboExito = true;
      } else {
        const { data } = await api.post("/productos", payload);
        setProductoId(data.id_producto); setEditar(data.id_producto);
        await subirVariantesEImagenesPendientes(data.id_producto);
        mostrarToast("exito", "Producto guardado con variantes e imágenes.");
        huboExito = true;
      }
    } catch (err) {
      console.error("[guardarProducto] error real:", err);
      const msg = err.response?.data?.message || "Error al guardar.";
      setErrores(prev => ({ ...prev, general: msg }));
      mostrarToast("error", msg);
    } finally {
      setGuardando(false);
      if (huboExito) {
        console.log("[guardarProducto] éxito — cerrando modal y refrescando lista");
        setModal(false);
        window.scrollTo(0, 0);
        recargarTodo();
      } else {
        console.log("[guardarProducto] NO hubo éxito — el modal se queda abierto a propósito");
      }
    }
  };

  const guardar = async () => {
    if (!validar()) { console.log("[guardar] bloqueado por validación (ver detalle arriba)"); return; }
    if (!editar) {
      if (pendingImagenes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una imagen del producto." })); return; }
      if (pendingVariantes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una talla disponible." })); return; }
    }
    const sinFotos = await obtenerColoresSinFotos();
    if (sinFotos.length > 0) { console.log("[guardar] bloqueado por colores sin fotos:", sinFotos); setColoresSinFotos(sinFotos); return; }
    console.log("[guardar] validación OK, llamando a guardarProducto()");
    await guardarProducto();
  };

  const confirmarEliminarColoresSinFotos = () => {
    setColoresAPurgar(coloresSinFotos.map(c => c.id_color));
    setColoresSinFotos([]);
  };

  const onColoresPurgados = () => {
    setColoresAPurgar([]);
    guardarProducto();
  };

  const eliminarFotosDeColor = (id_color) => setColoresAPurgarFotos([id_color]);
  const onFotosDeColorPurgadas = () => setColoresAPurgarFotos([]);

  const cerrarModal = () => {
    if (guardando) return;
    setModal(false); setErrores(ERRORES_INICIALES); setProductoId(null);
    setPendingVariantes([]); setPendingImagenes([]);
    setColoresSinFotos([]); setColoresAPurgar([]); setColoresAPurgarFotos([]);
    setVariantesVersion(0);
    recargarTodo();
  };

  const coloresPendientes = [...new Map(pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])).values()];

  return {
    editar, productoId, guardando, errores, setErrores, form, setForm,
    pendingVariantes, setPendingVariantes, pendingImagenes, setPendingImagenes,
    coloresSinFotos, setColoresSinFotos, coloresAPurgar, coloresAPurgarFotos,
    variantesVersion, setVariantesVersion, coloresPendientes,
    abrirRegistrar, abrirEditar, validarNombreProducto, guardar,
    confirmarEliminarColoresSinFotos, onColoresPurgados, eliminarFotosDeColor, onFotosDeColorPurgadas,
    cerrarModal,
  };
}
