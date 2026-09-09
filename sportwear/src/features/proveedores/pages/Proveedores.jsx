// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import FilterToggle from "../../../shared/components/FilterToggle";
import { validarNumeroDocumento, validarTelefono } from "../../../shared/utils/numerico";
// Proveedores.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Proveedores.layout.css';
import './Proveedores.cards.css';
import './Proveedores.modals.css';
import './Proveedores.responsive.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import ProveedoresTable from "../components/proveedores/ProveedoresTable";
import ProveedorListItem from "../components/proveedores/ProveedorListItem";
import ProveedorDetailPanel from "../components/proveedores/ProveedorDetailPanel";
import ProveedorFormModal from "../components/proveedores/ProveedorFormModal";
import ProveedorDetalleModal from "../components/proveedores/ProveedorDetalleModal";
import {
  FORM_VACIO, dividirNombreContacto,
  validarCampoNombresContacto, validarCampoApellidosContacto, validarCampoEmail,
} from "../utils/proveedoresHelpers";

// ── Iconos del selector de vista (lista+detalle / tabla) — mismos que Roles ──
const IconVistaTarjetas = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconVistaTabla = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const OPCIONES_VISTA = [
  { valor: "tarjetas", etiqueta: <span title="Lista y detalle"><IconVistaTarjetas /></span> },
  { valor: "tabla",    etiqueta: <span title="Tabla"><IconVistaTabla /></span> },
];

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [vista, setVista] = useState(() => localStorage.getItem("sz_proveedores_vista") || "tarjetas");
  const [modal, setModal] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarEstado, setConfirmarEstado] = useState(null);

  // ── Selección para la vista lista+detalle ──
  const [proveedorSeleccionadoId, setProveedorSeleccionadoId] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
  const puedeVerOrdenes = tienePerm('Compras.ver');

  const cambiarVista = (v) => {
    setVista(v);
    localStorage.setItem("sz_proveedores_vista", v);
  };

  // El directorio de proveedores es chico (no miles de filas): se trae
  // completo de una vez y el buscador + filtro de estado filtran en el
  // cliente, igual que ya hace la vista de tarjetas de Roles.
  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/proveedores");
      setDatos(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los proveedores.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  // "Últimas órdenes de compra" del panel de detalle: se calculan en el
  // cliente a partir de /compras (mismo criterio que "prendas con este
  // color" en la vitrina de Colores) — sin agregar ningún endpoint nuevo.
  useEffect(() => {
    if (vista !== 'tarjetas' || !puedeVerOrdenes) return;
    setCargandoOrdenes(true);
    api.get('/compras').then(({ data }) => setOrdenes(data || []))
      .catch(() => setOrdenes([]))
      .finally(() => setCargandoOrdenes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista]);

  const conteoActivos = datos.filter(p => p.estado === 'Activo').length;
  const conteoInactivos = datos.filter(p => p.estado === 'Inactivo').length;

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return datos
      .filter(p => !termino
        || p.razon_social?.toLowerCase().includes(termino)
        || p.nombre_comercial?.toLowerCase().includes(termino)
        || p.numero_doc?.toLowerCase().includes(termino))
      .filter(p => filtroEstado === "todos" ? true : p.estado === (filtroEstado === "activos" ? "Activo" : "Inactivo"));
  }, [datos, busqueda, filtroEstado]);

  // Mantiene una selección válida (primer proveedor visible) cuando cambia
  // la vista, la búsqueda o el filtro de estado.
  useEffect(() => {
    if (vista !== 'tarjetas') return;
    if (filtrados.length === 0) { setProveedorSeleccionadoId(null); return; }
    if (!filtrados.some(p => p.id_proveedor === proveedorSeleccionadoId)) {
      setProveedorSeleccionadoId(filtrados[0].id_proveedor);
    }
  }, [vista, filtrados, proveedorSeleccionadoId]);

  const proveedorSeleccionado = filtrados.find(p => p.id_proveedor === proveedorSeleccionadoId) || null;
  const indexSeleccionado = filtrados.findIndex(p => p.id_proveedor === proveedorSeleccionadoId);
  const ordenesDelSeleccionado = useMemo(
    () => proveedorSeleccionado ? ordenes.filter(o => o.id_proveedor === proveedorSeleccionado.id_proveedor) : [],
    [ordenes, proveedorSeleccionado]
  );

  const abrirRegistrar = () => {
    setEditar(null);
    setForm(FORM_VACIO);
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_proveedor);
    setForm({
      tipo_persona: p.tipo_doc === "NIT" ? "Juridica" : "Natural",
      tipo_doc: p.tipo_doc || "NIT",
      numero_doc: p.numero_doc || "",
      razon_social: p.razon_social || "",
      nombre_comercial: p.nombre_comercial || "",
      ...dividirNombreContacto(p.nombre_contacto),
      cargo_contacto: p.cargo_contacto || "",
      telefono_celular: p.telefono_celular || "",
      email_contacto: p.email_contacto || "",
      ciudad: p.ciudad || "",
      departamento: p.departamento || "",
      pais: p.pais || "Colombia",
      direccion: p.direccion || "",
      estado: p.estado || "Activo",
    });
    setErrores({});
    setModal(true);
  };

  const validar = () => {
    const e = {};
    if (!form.tipo_doc) e.tipo_doc = "Selecciona un tipo de documento";
    if (!form.numero_doc.trim()) e.numero_doc = "El número de documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(form.tipo_doc, form.numero_doc);
      if (errorLongitud) e.numero_doc = errorLongitud;
    }
    if (form.tipo_persona === "Juridica" && !form.razon_social.trim()) e.razon_social = "La razón social es obligatoria";
    const errorNombresContacto = validarCampoNombresContacto(form.nombres_contacto);
    if (errorNombresContacto) e.nombres_contacto = errorNombresContacto;
    const errorApellidosContacto = validarCampoApellidosContacto(form.apellidos_contacto);
    if (errorApellidosContacto) e.apellidos_contacto = errorApellidosContacto;
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    const errorTelefono = validarTelefono(form.telefono_celular);
    if (errorTelefono) e.telefono_celular = errorTelefono;
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    const errorEmailContacto = validarCampoEmail(form.email_contacto);
    if (errorEmailContacto) e.email_contacto = errorEmailContacto;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const pedirConfirmacion = () => {
    if (!validar()) return;
    if (editar) { setConfirmarGuardar(true); return; }
    guardar();
  };

  const guardar = async () => {
    setConfirmarGuardar(false);
    setGuardando(true);
    try {
      const { nombres_contacto, apellidos_contacto, tipo_persona, ...resto } = form;
      const nombreCompletoContacto = `${nombres_contacto} ${apellidos_contacto}`.trim();
      const payload = {
        ...resto,
        nombre_contacto: nombreCompletoContacto,
        // Persona Natural: el proveedor es la propia persona, no hay razón social separada.
        razon_social: tipo_persona === "Natural" ? nombreCompletoContacto : resto.razon_social,
      };
      if (editar) await api.put(`/proveedores/${editar}`, payload);
      else        await api.post("/proveedores", payload);
      cargarProveedores();
      setModal(false);
      showToast("exito", editar ? "Proveedor actualizado correctamente." : "Proveedor registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  // El aviso de éxito/error ya lo muestra <StatusToggle> centralmente a partir de
  // lo que esta función resuelva o rechace — por eso NO se atrapa el error acá
  // (antes se atrapaba y no se re-lanzaba, así que StatusToggle nunca se enteraba
  // del fallo y mostraba igual un toast de éxito encima del de error).
  const toggleEstado = async (id) => {
    const res = await api.patch(`/proveedores/${id}/estado`);
    setDatos((prev) => prev.map((p) => (p.id_proveedor === id ? { ...p, estado: res.data.estado } : p)));
  };

  // Igual que en Roles: la vista lista+detalle cambia de estado con
  // confirmación propia (no <StatusToggle>), porque el botón vive en el
  // panel de detalle, no en una celda de tabla.
  const solicitarCambioEstado = (proveedor) => setConfirmarEstado(proveedor);
  const confirmarCambioEstado = async () => {
    if (!confirmarEstado) return;
    try {
      const res = await api.patch(`/proveedores/${confirmarEstado.id_proveedor}/estado`);
      setDatos((prev) => prev.map((p) => (p.id_proveedor === confirmarEstado.id_proveedor ? { ...p, estado: res.data.estado } : p)));
      showToast("exito", `Proveedor "${confirmarEstado.razon_social}" ${res.data.estado === 'Activo' ? 'activado' : 'desactivado'} correctamente.`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo cambiar el estado del proveedor.");
    } finally {
      setConfirmarEstado(null);
    }
  };

  if (cargando) {
    return <Loader text="Cargando proveedores..." />;
  }

  // Mismo criterio que Usuarios: "Editar" un registro existente siempre se
  // resuelve en un panel acoplado (nunca en el modal centrado), tanto en la
  // vista de tabla (donde además abre el panel) como en lista+detalle (donde
  // reemplaza al panel de detalle en la misma columna).
  const editandoExistente = modal && !!editar;
  const panelAbierto = vista === 'tabla' && (verDetalle || editandoExistente);

  return (
    <div className="proveedores-container">
      {error && <div className="compras-error-banner">{error}</div>}

      <div className="proveedores-actions-bar">
        <div className="proveedores-actions-left">
          <div className="proveedores-search-wrapper">
            <span className="proveedores-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="proveedores-search-input"
              placeholder="Buscar proveedor o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="proveedores-search-clear" onClick={() => setBusqueda("")}>
                <IconX />
              </button>
            )}
          </div>

          <div className="prov-filter-toggle">
            <button className={`prov-filter-btn${filtroEstado === "todos" ? " active" : ""}`} onClick={() => setFiltroEstado("todos")}>Todos ({datos.length})</button>
            <button className={`prov-filter-btn${filtroEstado === "activos" ? " active" : ""}`} onClick={() => setFiltroEstado("activos")}>Activos ({conteoActivos})</button>
            <button className={`prov-filter-btn${filtroEstado === "inactivos" ? " active" : ""}`} onClick={() => setFiltroEstado("inactivos")}>Inactivos ({conteoInactivos})</button>
          </div>

          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
        </div>
        <div className="proveedores-actions-right">
          {tienePerm('Proveedores.crear') && (
            <button className="proveedores-btn-primary" onClick={abrirRegistrar}>
              <span>+</span> Nuevo proveedor
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => filtrados}
            columnas={[
              { header: "Documento", value: (p) => `${p.tipo_doc} ${p.numero_doc}` },
              { header: "Empresa", value: (p) => p.nombre_comercial || p.razon_social },
              { header: "Contacto", key: "nombre_contacto" },
              { header: "Teléfono", key: "telefono_celular" },
              { header: "Email", key: "email_contacto" },
              { header: "Ciudad", key: "ciudad" },
              { header: "Compras", key: "total_compras" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="proveedores"
            titulo="Proveedores"
          />
        </div>
      </div>

      <div className="proveedores-results-count">
        {filtrados.length} proveedor{filtrados.length !== 1 ? 'es' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
      </div>

      {vista === "tabla" ? (
        <div className={panelAbierto ? "proveedores-contenido-split" : "proveedores-contenido"}>
          <ProveedoresTable
            datos={filtrados} tienePerm={tienePerm} toggleEstado={toggleEstado}
            setVerDetalle={setVerDetalle} abrirEditar={abrirEditar}
            totalPaginas={1} pagina={1} setPagina={() => {}} totalProveedores={filtrados.length}
          />

          {panelAbierto && (
            <div className="proveedores-panel-columna">
              {editandoExistente ? (
                <ProveedorFormModal
                  variante="panel"
                  editar={editar} form={form} setForm={setForm} errores={errores} setErrores={setErrores}
                  guardando={guardando} setModal={setModal} pedirConfirmacion={pedirConfirmacion}
                />
              ) : (
                <ProveedorDetalleModal verDetalle={verDetalle} setVerDetalle={setVerDetalle} tienePerm={tienePerm} abrirEditar={abrirEditar} />
              )}
            </div>
          )}
        </div>
      ) : filtrados.length === 0 ? (
        <p className="prov-tabla-empty">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay proveedores para mostrar."}</p>
      ) : (
        <div className="prov-lista-detalle">
          <div className="prov-lista">
            {filtrados.map((p, i) => (
              <ProveedorListItem
                key={p.id_proveedor} proveedor={p} index={i}
                seleccionado={p.id_proveedor === proveedorSeleccionadoId}
                onSeleccionar={setProveedorSeleccionadoId}
              />
            ))}
          </div>

          {editandoExistente ? (
            <ProveedorFormModal
              variante="panel"
              editar={editar} form={form} setForm={setForm} errores={errores} setErrores={setErrores}
              guardando={guardando} setModal={setModal} pedirConfirmacion={pedirConfirmacion}
            />
          ) : (
            <ProveedorDetailPanel
              proveedor={proveedorSeleccionado}
              index={indexSeleccionado}
              ordenes={ordenesDelSeleccionado}
              cargandoOrdenes={cargandoOrdenes}
              puedeVerOrdenes={puedeVerOrdenes}
              onEditar={abrirEditar}
              onCambiarEstado={solicitarCambioEstado}
              puedeEditar={tienePerm('Proveedores.editar')}
              puedeEstado={tienePerm('Proveedores.estado')}
            />
          )}
        </div>
      )}

      {/* ── Modal centrado: solo para crear un proveedor nuevo — editar uno
          existente siempre se resuelve en el panel acoplado (tabla o
          lista+detalle), nunca en el modal centrado. ── */}
      {modal && !editar && (
        <ProveedorFormModal
          editar={editar} form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          guardando={guardando} setModal={setModal} pedirConfirmacion={pedirConfirmacion}
        />
      )}

      {confirmarGuardar && (
        <ConfirmModal
          title="¿Guardar los cambios del proveedor?"
          message="Se actualizará la información de este proveedor."
          onCancel={() => setConfirmarGuardar(false)}
          onConfirm={guardar}
          confirmLabel="Sí, guardar"
        />
      )}

      {confirmarEstado && (
        <ConfirmModal
          title={`¿${confirmarEstado.estado === 'Activo' ? 'Desactivar' : 'Activar'} este proveedor?`}
          message={`Se ${confirmarEstado.estado === 'Activo' ? 'desactivará' : 'activará'} "${confirmarEstado.razon_social}".`}
          onCancel={() => setConfirmarEstado(null)}
          onConfirm={confirmarCambioEstado}
          confirmLabel={confirmarEstado.estado === 'Activo' ? 'Sí, desactivar' : 'Sí, activar'}
        />
      )}
    </div>
  );
}
