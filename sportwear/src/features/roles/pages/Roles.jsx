// src/pages/roles/Roles.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import Loader from "../../../shared/components/Loader";
import Toast from "../../../shared/components/Toast";
// Roles.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Roles.cards.css';
import './Roles.modals.css';
import './Roles.toolbar.css';
import { IconX, IconSearch } from "../../../shared/components/Icons";
import FilterToggle from "../../../shared/components/FilterToggle";
import RoleListItem from "../components/roles/RoleListItem";
import RoleDetailPanel from "../components/roles/RoleDetailPanel";
import RolesTable from "../components/roles/RolesTable";
import RolModal from "../components/roles/RolModal";
import ConfirmEstadoModal from "../components/roles/ConfirmEstadoModal";
import { validarNombreRol, mergeModulos, MODULOS_FALLBACK, esRolProtegido } from "../utils/rolesHelpers";

// ── Iconos del selector de vista (tarjetas / tabla) ──────────────────────────
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
  { valor: "tarjetas", etiqueta: <span title="Tarjetas"><IconVistaTarjetas /></span> },
  { valor: "tabla",    etiqueta: <span title="Tabla"><IconVistaTabla /></span> },
];

// ── Página principal ──────────────────────────────────────────────────────────
export default function Roles() {
  const { usuario } = useAuth();
  const tienePerm   = (p) => (usuario?.permisos || []).includes(p);

  const [datos,              setDatos]              = useState([]);
  const [busqueda,           setBusqueda]           = useState("");
  const [filtroEstado,       setFiltroEstado]       = useState("todos");
  const [vista,              setVista]              = useState(() => localStorage.getItem("sz_roles_vista") || "tarjetas");
  const [loading,            setLoading]            = useState(true);
  const [modal,              setModal]              = useState(false);
  const [editar,             setEditar]             = useState(null);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [permisosCatalogo,   setPermisosCatalogo]   = useState({});
  const [confirm,            setConfirm]            = useState(null);
  const [form,    setForm]    = useState({ nombre: "", estado: "Activo", permisos: [] });
  const [errores, setErrores] = useState({});
  const [toast,   setToast]   = useState(null);

  // ── Selección para la vista de tarjetas (lista + panel de detalle) ──────────
  const [rolSeleccionadoId, setRolSeleccionadoId] = useState(null);
  const [detalle, setDetalle] = useState({ permisos: [], loading: false, loadedId: null });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const cambiarVista = (v) => {
    setVista(v);
    localStorage.setItem("sz_roles_vista", v);
  };

  const filtrados = useMemo(() => datos
    .filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(r => filtroEstado === "todos" ? true : r.estado === (filtroEstado === "activos" ? "Activo" : "Inactivo")),
  [datos, busqueda, filtroEstado]);

  const totalPermisosCatalogo = useMemo(
    () => Object.values(permisosCatalogo).reduce((acc, acciones) => acc + (Array.isArray(acciones) ? acciones.length : 0), 0),
    [permisosCatalogo]
  );

  const conteoActivos   = datos.filter(r => r.estado === 'Activo').length;
  const conteoInactivos = datos.filter(r => r.estado === 'Inactivo').length;

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/roles");
      setDatos(data);
    } catch (err) { console.error("Error cargando roles:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/roles/modulos').then(({ data }) => setModulosDisponibles(mergeModulos(data))).catch(() => setModulosDisponibles(MODULOS_FALLBACK));
    api.get('/roles/permisos').then(({ data }) => setPermisosCatalogo(data || {})).catch(() => setPermisosCatalogo({}));
  }, [cargar]);

  // Mantiene una selección válida (primer rol visible) cuando cambia la
  // vista, la búsqueda o el filtro de estado.
  useEffect(() => {
    if (vista !== 'tarjetas') return;
    if (filtrados.length === 0) { setRolSeleccionadoId(null); return; }
    if (!filtrados.some(r => r.id_rol === rolSeleccionadoId)) {
      setRolSeleccionadoId(filtrados[0].id_rol);
    }
  }, [vista, filtrados, rolSeleccionadoId]);

  // Carga los permisos del rol seleccionado para la matriz del panel.
  useEffect(() => {
    if (!rolSeleccionadoId) return;
    let cancelado = false;
    setDetalle(prev => ({ ...prev, loading: true }));
    api.get(`/roles/${rolSeleccionadoId}/permisos`)
      .then(({ data }) => {
        if (cancelado) return;
        setDetalle({ permisos: Array.isArray(data) ? data : [], loading: false, loadedId: rolSeleccionadoId });
      })
      .catch(() => {
        if (cancelado) return;
        setDetalle({ permisos: [], loading: false, loadedId: rolSeleccionadoId });
      });
    return () => { cancelado = true; };
  }, [rolSeleccionadoId]);

  const abrirRegistrar = () => {
    setEditar(null); setForm({ nombre: "", estado: "Activo", permisos: [] }); setErrores({}); setModal(true);
  };

  const abrirEditar = async (r) => {
    if (esRolProtegido(r.nombre)) return;
    setEditar(r.id_rol); setForm({ nombre: r.nombre, estado: r.estado, permisos: [] }); setErrores({}); setModal(true);
    try {
      const { data } = await api.get(`/roles/${r.id_rol}/permisos`);
      if (Array.isArray(data) && data.length > 0) {
        setForm(prev => ({ ...prev, permisos: data.map(p => p.id_permiso).filter(Boolean) }));
      }
    } catch (err) { console.error("Error cargando permisos:", err); }
  };

  const validar = () => {
    const e = {};
    const msgNombre = validarNombreRol(form.nombre);
    if (msgNombre) e.nombre = msgNombre;
    if (form.permisos.length === 0) e.permisos = "Selecciona al menos un permiso";
    setErrores(e);
    return e;
  };

  const guardar = async () => {
    const erroresValidacion = validar();
    if (Object.keys(erroresValidacion).length > 0) {
      showToast('error', erroresValidacion.nombre || erroresValidacion.permisos);
      return;
    }
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false); cargar();
      if (editar && editar === rolSeleccionadoId) {
        setDetalle(prev => ({ ...prev, loading: true }));
        api.get(`/roles/${editar}/permisos`)
          .then(({ data }) => setDetalle({ permisos: Array.isArray(data) ? data : [], loading: false, loadedId: editar }))
          .catch(() => setDetalle({ permisos: [], loading: false, loadedId: editar }));
      }
      showToast('exito', editar ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) setErrores(prev => ({ ...prev, ...backendErrors }));
      showToast('error', err.response?.data?.message || 'Ocurrió un error al guardar el rol.');
    }
  };

  const solicitarCambioEstado = async (rol) => {
    if (esRolProtegido(rol.nombre)) return;
    if (rol.estado === 'Inactivo') {
      try {
        await api.patch(`/roles/${rol.id_rol}/estado`);
        cargar();
        showToast('exito', `Rol "${rol.nombre}" activado correctamente.`);
      } catch (err) {
        console.error("Error activando rol:", err);
        showToast('error', err.response?.data?.message || 'Error al activar el rol.');
      }
      return;
    }
    setConfirm({ rol, usuariosCount: null });
    try {
      const { data } = await api.get(`/roles/${rol.id_rol}/usuarios-count`);
      setConfirm({ rol, usuariosCount: data.total });
    } catch { setConfirm({ rol, usuariosCount: 0 }); }
  };

  const confirmarCambioEstado = async () => {
    if (!confirm) return;
    try {
      await api.patch(`/roles/${confirm.rol.id_rol}/estado`);
      const nombreRol = confirm.rol.nombre;
      setConfirm(null);
      cargar();
      showToast('exito', `Rol "${nombreRol}" desactivado correctamente.`);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      showToast('error', err.response?.data?.message || 'Error al cambiar el estado del rol.');
    }
  };

  if (loading) return <Loader text="Cargando roles..." />;

  const rolSeleccionado    = filtrados.find(r => r.id_rol === rolSeleccionadoId) || null;
  const indexSeleccionado  = filtrados.findIndex(r => r.id_rol === rolSeleccionadoId);
  const permisosDelDetalle = detalle.loadedId === rolSeleccionadoId ? detalle.permisos : [];

  return (
    <div className="roles-container">
      <div className="roles-actions-bar">
        <div className="roles-actions-left">
          <div className="roles-search-wrapper">
            <span className="roles-search-icon"><IconSearch /></span>
            <input type="text" className="roles-search-input" placeholder="Buscar rol..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            {busqueda && <button className="roles-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>

          <div className="roles-filter-toggle">
            <button className={`roles-filter-btn${filtroEstado === "todos" ? " active" : ""}`} onClick={() => setFiltroEstado("todos")}>Todos ({datos.length})</button>
            <button className={`roles-filter-btn${filtroEstado === "activos" ? " active" : ""}`} onClick={() => setFiltroEstado("activos")}>Activos ({conteoActivos})</button>
            <button className={`roles-filter-btn${filtroEstado === "inactivos" ? " active" : ""}`} onClick={() => setFiltroEstado("inactivos")}>Inactivos ({conteoInactivos})</button>
          </div>

          {busqueda && <span className="roles-search-count">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>}

          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
        </div>

        {tienePerm('Roles.crear') && (
          <button className="roles-btn-nuevo" onClick={abrirRegistrar}><span>+</span> Nuevo rol</button>
        )}
      </div>

      {vista === "tabla" ? (
        <div className="tbl-frame">
          <div className="tbl-container">
            <table className="tbl">
              <RolesTable
                roles={filtrados}
                onEditar={abrirEditar}
                onCambiarEstado={solicitarCambioEstado}
                puedeEditar={tienePerm('Roles.editar')}
                puedeEstado={tienePerm('Roles.estado')}
                busqueda={busqueda}
              />
            </table>
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="roles-tabla-empty">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay roles para mostrar."}</p>
      ) : (
        <div className="roles-lista-detalle">
          <div className="roles-lista">
            {filtrados.map((r, i) => (
              <RoleListItem
                key={r.id_rol} rol={r} index={i}
                seleccionado={r.id_rol === rolSeleccionadoId}
                totalPermisos={totalPermisosCatalogo}
                onSeleccionar={setRolSeleccionadoId}
              />
            ))}
          </div>

          <RoleDetailPanel
            rol={rolSeleccionado}
            index={indexSeleccionado}
            permisosCatalogo={permisosCatalogo}
            permisosOtorgados={permisosDelDetalle}
            loadingPermisos={detalle.loading && detalle.loadedId !== rolSeleccionadoId}
            totalPermisosCatalogo={totalPermisosCatalogo}
            onEditar={abrirEditar}
            onCambiarEstado={solicitarCambioEstado}
            puedeEditar={tienePerm('Roles.editar')}
            puedeEstado={tienePerm('Roles.estado')}
          />
        </div>
      )}

      <ConfirmEstadoModal confirm={confirm} setConfirm={setConfirm} datos={datos} confirmarCambioEstado={confirmarCambioEstado} />

      {modal && (
        <RolModal
          titulo={editar ? "Editar rol" : "Nuevo rol"}
          form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          modulosDisponibles={modulosDisponibles} permisosCatalogo={permisosCatalogo}
          onClose={() => setModal(false)} onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
