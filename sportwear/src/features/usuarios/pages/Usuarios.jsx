// src/pages/usuarios/Usuarios.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import Toast from "../../../shared/components/Toast";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import FilterToggle from "../../../shared/components/FilterToggle";
import './Usuarios.css';
import './Usuarios.cards.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import UsuariosTable from "../components/usuarios/UsuariosTable";
import ClientesTable from "../components/usuarios/ClientesTable";
import UsuarioListItem from "../components/usuarios/UsuarioListItem";
import ClienteListItem from "../components/usuarios/ClienteListItem";
import UsuarioFormModal from "../components/usuarios/UsuarioFormModal";
import ClienteFormModal from "../components/usuarios/ClienteFormModal";
import UsuarioDetalleModal from "../components/usuarios/UsuarioDetalleModal";
import ClienteDetalleModal from "../components/usuarios/ClienteDetalleModal";
import { useUsuarios } from "../hooks/useUsuarios";

// ── Iconos del selector de vista (lista+detalle / tabla) — mismos que Pedidos/Proveedores/Compras/Ventas ──
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

export default function Usuarios() {
  const u = useUsuarios();
  const [vista, setVista] = useState(() => localStorage.getItem("sz_usuarios_vista") || "tarjetas");

  // Al cambiar de vista se cierra cualquier panel de ver detalle/editar
  // abierto — evita pasar a la tabla con el panel acoplado todavía montado.
  const cambiarVista = (v) => {
    setVista(v);
    localStorage.setItem("sz_usuarios_vista", v);
    u.setDetalle(null);
    u.setClienteDetalle(null);
    u.setModal(false);
  };

  // Vista "lista + detalle": mantiene seleccionado el primer registro
  // visible de la página actual, igual que en Roles/Proveedores/Pedidos.
  useEffect(() => {
    if (vista !== 'tarjetas' || u.modal) return;
    if (u.filtradosPagina.length === 0) return;
    if (u.filterType === 'usuarios') {
      if (!u.filtradosPagina.some((x) => x.id_usuario === u.detalle?.id_usuario)) u.abrirDetalle(u.filtradosPagina[0]);
    } else {
      if (!u.filtradosPagina.some((x) => x.id_cliente === u.clienteDetalle?.id_cliente)) u.setClienteDetalle(u.filtradosPagina[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, u.filterType, u.filtradosPagina, u.modal]);

  if (u.loading) return <Loader text="Cargando usuarios..." />;

  // Editar un registro existente se resuelve en el panel acoplado a la tabla
  // (no en el modal centrado); crear uno nuevo sigue usando el modal.
  const editandoExistente = u.modal && !!u.editar;
  const panelAbierto =
    (u.filterType === 'usuarios' && (u.detalle || editandoExistente)) ||
    (u.filterType === 'clientes' && (u.clienteDetalle || editandoExistente));

  const panelContenido = u.filterType === 'usuarios' ? (
    editandoExistente ? (
      <UsuarioFormModal
        variante="panel"
        editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarUsuario={u.handleGuardarUsuario}
        form={u.form} setForm={u.setForm} errores={u.errores} setErrores={u.setErrores}
        roles={u.roles} barrios={u.barrios} esRolAdmin={u.esRolAdmin}
        showPassword={u.showPassword} setShowPassword={u.setShowPassword}
        formRef={u.formRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
      />
    ) : (
      <UsuarioDetalleModal detalle={u.detalle} setDetalle={u.setDetalle} tienePerm={u.tienePerm} usuarioActual={u.usuario} abrirEditar={u.abrirEditar} getRoleName={u.getRoleName} />
    )
  ) : (
    editandoExistente ? (
      <ClienteFormModal
        variante="panel"
        editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarCliente={u.handleGuardarCliente}
        clienteForm={u.clienteForm} setClienteForm={u.setClienteForm} erroresCliente={u.erroresCliente} setErroresCliente={u.setErroresCliente}
        barrios={u.barrios}
        clienteFormRef={u.clienteFormRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
      />
    ) : (
      <ClienteDetalleModal clienteDetalle={u.clienteDetalle} setClienteDetalle={u.setClienteDetalle} tienePerm={u.tienePerm} abrirEditarCliente={u.abrirEditarCliente} />
    )
  );

  return (
    <div className="usuarios-container">
      <div className="usuarios-actions-bar">
        <div className="usuarios-actions-left">
          <div className="usuarios-search-wrapper">
            <span className="usuarios-search-icon"><IconSearch /></span>
            <input type="text" className="usuarios-search-input" placeholder={u.filterType === 'usuarios' ? "Buscar por nombre, email o documento..." : "Buscar por nombre o documento..."} value={u.busqueda}
              onChange={e => u.setBusqueda(e.target.value)} />
            {u.busqueda && <button className="usuarios-search-clear" onClick={() => u.setBusqueda("")}><IconX /></button>}
          </div>

          {u.tieneUsuarios && u.tieneClientes && (
            <div className="usuarios-filter-toggle">
              <button className={`usuarios-filter-btn ${u.filterType === 'usuarios' ? 'active' : ''}`} onClick={() => { u.setFilterType('usuarios'); u.setPaginaUsuarios(1); }}>Usuarios</button>
              <button className={`usuarios-filter-btn ${u.filterType === 'clientes' ? 'active' : ''}`} onClick={() => { u.setFilterType('clientes'); u.setPaginaClientes(1); }}>Clientes</button>
            </div>
          )}
          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
        </div>

        <div className="usuarios-actions-right">
          {u.filterType === 'usuarios' && u.tienePerm('Usuarios.crear') && (
            <button className="usuarios-btn-primary" onClick={u.abrirRegistrar}><span>+</span> Nuevo usuario</button>
          )}
          {u.filterType === 'clientes' && u.tienePerm('Clientes.crear') && (
            <button className="usuarios-btn-primary" onClick={u.abrirRegistrarCliente}><span>+</span> Nuevo cliente</button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const url = u.filterType === 'usuarios' ? "/usuarios" : "/clientes/rol-cliente";
              const { data } = await api.get(url, { params: { q: u.busquedaDebounced || undefined } });
              return data;
            }}
            columnas={u.filterType === 'usuarios' ? [
              { header: "Documento", value: (row) => row.documento ? `${row.tipo_doc} ${row.documento}` : "—" },
              { header: "Usuario", key: "nombre" },
              { header: "Email", key: "email" },
              { header: "Rol", value: (row) => row.rol || u.getRoleName(row.id_rol) },
              { header: "Estado", key: "estado" },
            ] : [
              { header: "Documento", key: "documento" },
              { header: "Cliente", key: "nombre" },
              { header: "Teléfono", key: "telefono" },
              { header: "Barrio", key: "barrio_nombre" },
              { header: "Cuotas", value: (row) => row.permiso_cuotas !== false ? "Sí" : "No" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo={u.filterType === 'usuarios' ? "usuarios" : "clientes"}
            titulo={u.filterType === 'usuarios' ? "Usuarios" : "Clientes"}
          />
        </div>
      </div>

      {vista === 'tabla' ? (
        <div className={panelAbierto ? "usuarios-contenido-split" : "usuarios-contenido"}>
          <div className="tbl-frame">
            <div className="tbl-container">
              <table className="tbl">
                {u.filterType === 'usuarios' ? (
                  <UsuariosTable
                    usuarios={u.filtradosPagina} tienePerm={u.tienePerm} esRolAdmin={u.esRolAdmin} getRoleName={u.getRoleName}
                    usuarioActual={u.usuario} toggleEstadoUsuario={u.toggleEstadoUsuario}
                    abrirDetalle={u.abrirDetalle} abrirEditar={u.abrirEditar} busqueda={u.busqueda}
                  />
                ) : (
                  <ClientesTable
                    clientes={u.filtradosPagina} tienePerm={u.tienePerm}
                    toggleEstadoCliente={u.toggleEstadoCliente} toggleClientePermisoCuotas={u.toggleClientePermisoCuotas}
                    setClienteDetalle={u.setClienteDetalle} abrirEditarCliente={u.abrirEditarCliente} busqueda={u.busqueda}
                  />
                )}
              </table>

              {u.totalPaginas > 1 && (
                <div className="paginador">
                  <button className="paginador-btn" onClick={() => u.setPagina(p => Math.max(p - 1, 1))} disabled={u.pagina === 1}>‹</button>
                  {Array.from({ length: u.totalPaginas }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`paginador-btn ${n === u.pagina ? "paginador-btn-active" : ""}`} onClick={() => u.setPagina(n)}>{n}</button>
                  ))}
                  <button className="paginador-btn" onClick={() => u.setPagina(p => Math.min(p + 1, u.totalPaginas))} disabled={u.pagina === u.totalPaginas}>›</button>
                  <span className="paginador-info">Página {u.pagina} de {u.totalPaginas} · {u.totalRegistros} registros</span>
                </div>
              )}
            </div>
          </div>

          {panelAbierto && (
            <div className="usuarios-panel-columna">
              {panelContenido}
            </div>
          )}
        </div>
      ) : u.filtradosPagina.length === 0 ? (
        <p className="usr-empty">{u.busqueda ? `No se encontraron resultados para "${u.busqueda}".` : "No hay registros para mostrar."}</p>
      ) : (
        <div className="usr-lista-detalle">
          <div className="usr-lista">
            {u.filterType === 'usuarios' ? (
              u.filtradosPagina.map((usuario) => (
                <UsuarioListItem
                  key={usuario.id_usuario} usuario={usuario} getRoleName={u.getRoleName}
                  seleccionado={usuario.id_usuario === u.detalle?.id_usuario}
                  onSeleccionar={(id) => {
                    const usuario2 = u.filtradosPagina.find((x) => x.id_usuario === id);
                    if (usuario2) u.abrirDetalle(usuario2);
                  }}
                />
              ))
            ) : (
              u.filtradosPagina.map((cliente) => (
                <ClienteListItem
                  key={cliente.id_cliente} cliente={cliente}
                  seleccionado={cliente.id_cliente === u.clienteDetalle?.id_cliente}
                  onSeleccionar={(id) => {
                    const cliente2 = u.filtradosPagina.find((x) => x.id_cliente === id);
                    if (cliente2) u.setClienteDetalle(cliente2);
                  }}
                />
              ))
            )}
          </div>

          {panelAbierto && panelContenido}
        </div>
      )}

      {u.totalPaginas > 1 && vista === 'tarjetas' && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => u.setPagina(p => Math.max(p - 1, 1))} disabled={u.pagina === 1}>‹</button>
          {Array.from({ length: u.totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === u.pagina ? "paginador-btn-active" : ""}`} onClick={() => u.setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => u.setPagina(p => Math.min(p + 1, u.totalPaginas))} disabled={u.pagina === u.totalPaginas}>›</button>
          <span className="paginador-info">Página {u.pagina} de {u.totalPaginas} · {u.totalRegistros} registros</span>
        </div>
      )}

      {u.modal && u.filterType === 'usuarios' && !u.editar && (
        <UsuarioFormModal
          editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarUsuario={u.handleGuardarUsuario}
          form={u.form} setForm={u.setForm} errores={u.errores} setErrores={u.setErrores}
          roles={u.roles} barrios={u.barrios} esRolAdmin={u.esRolAdmin}
          showPassword={u.showPassword} setShowPassword={u.setShowPassword}
          formRef={u.formRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
        />
      )}

      {u.modal && u.filterType === 'clientes' && !u.editar && (
        <ClienteFormModal
          editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarCliente={u.handleGuardarCliente}
          clienteForm={u.clienteForm} setClienteForm={u.setClienteForm} erroresCliente={u.erroresCliente} setErroresCliente={u.setErroresCliente}
          barrios={u.barrios}
          clienteFormRef={u.clienteFormRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
        />
      )}

      <Toast toast={u.toast} />
    </div>
  );
}
