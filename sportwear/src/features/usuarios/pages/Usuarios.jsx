// src/pages/usuarios/Usuarios.jsx
import api from "../../../shared/services/api";
import Toast from "../../../shared/components/Toast";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import './Usuarios.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import UsuariosTable from "../components/usuarios/UsuariosTable";
import ClientesTable from "../components/usuarios/ClientesTable";
import UsuarioFormModal from "../components/usuarios/UsuarioFormModal";
import ClienteFormModal from "../components/usuarios/ClienteFormModal";
import UsuarioDetalleModal from "../components/usuarios/UsuarioDetalleModal";
import ClienteDetalleModal from "../components/usuarios/ClienteDetalleModal";
import { useUsuarios } from "../hooks/useUsuarios";

export default function Usuarios() {
  const u = useUsuarios();

  if (u.loading) return <Loader text="Cargando usuarios..." />;

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

      {u.modal && u.filterType === 'usuarios' && (
        <UsuarioFormModal
          editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarUsuario={u.handleGuardarUsuario}
          form={u.form} setForm={u.setForm} errores={u.errores} setErrores={u.setErrores}
          roles={u.roles} barrios={u.barrios} esRolAdmin={u.esRolAdmin}
          showPassword={u.showPassword} setShowPassword={u.setShowPassword}
          formRef={u.formRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
        />
      )}

      {u.modal && u.filterType === 'clientes' && (
        <ClienteFormModal
          editar={u.editar} setModal={u.setModal} guardandoModal={u.guardandoModal} handleGuardarCliente={u.handleGuardarCliente}
          clienteForm={u.clienteForm} setClienteForm={u.setClienteForm} erroresCliente={u.erroresCliente} setErroresCliente={u.setErroresCliente}
          barrios={u.barrios}
          clienteFormRef={u.clienteFormRef} verificarDocumentoDuplicado={u.verificarDocumentoDuplicado} verificarEmailDuplicado={u.verificarEmailDuplicado}
        />
      )}

      <UsuarioDetalleModal detalle={u.detalle} setDetalle={u.setDetalle} tienePerm={u.tienePerm} usuarioActual={u.usuario} abrirEditar={u.abrirEditar} getRoleName={u.getRoleName} />

      <ClienteDetalleModal clienteDetalle={u.clienteDetalle} setClienteDetalle={u.setClienteDetalle} tienePerm={u.tienePerm} abrirEditarCliente={u.abrirEditarCliente} />

      <Toast toast={u.toast} />
    </div>
  );
}
