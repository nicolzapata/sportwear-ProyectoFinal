// src/pages/clientes/MiCuenta.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import PaymentModal from "../../components/PaymentModal";
import OrderDetailModal from "../../components/OrderDetailModal";
import { IconCreditCard, IconShoppingCart } from "../../components/Icons";
import Loader from "../../components/Loader";
import { soloDigitos } from "../../utils/numerico";
import "./MiCuenta.css";

export default function MiCuenta() {
  const { usuario, actualizarUsuario } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos]               = useState([]);
  const [perfil, setPerfil]                 = useState(null);
  const [showModalSteps, setShowModalSteps] = useState(false);
  const [form, setForm]                     = useState({});
  const [errores, setErrores]               = useState({ nombre: "", documento: "" });
  const [guardando, setGuardando]           = useState(false);
  const [cargando, setCargando]             = useState(true);
  const [barrios, setBarrios]               = useState([]);
  const [zonas, setZonas]                   = useState([]);
  const [barFiltrados, setBarFiltrados]     = useState([]);
  const [detallesPedidos, setDetallesPedidos] = useState({});
  const [pagoModal, setPagoModal]           = useState(null);
  const [detalleModal, setDetalleModal]     = useState(null);
  const [toastMsg, setToastMsg]             = useState(null);

  useEffect(() => {
    if (!usuario) { navigate("/"); return; }
    setCargando(true);
    Promise.all([
      api.get("/ventas/mis-pedidos").catch(() => ({ data: [] })),
      api.get("/clientes/mi-perfil").catch(() => ({ data: null })),
      api.get("/barrios").catch(() => ({ data: [] })),
      api.get("/barrios/zonas").catch(() => ({ data: [] })),
    ]).then(([pedidosRes, perfilRes, barriosRes, zonasRes]) => {
      const filtrados = (pedidosRes.data || []).filter(
        (p) => ["Confirmado", "Pagado", "Cancelado", "Abonado"].includes(p.estado)
      );
      setPedidos(filtrados);
      if (perfilRes.data) {
        setPerfil(perfilRes.data);
        setForm({
          nombre:        perfilRes.data.nombre        || "",
          tipo_doc:      perfilRes.data.tipo_doc      || "CC",
          documento:     perfilRes.data.documento     || "",
          telefono:      perfilRes.data.telefono      || "",
          email:         perfilRes.data.email         || "",
          id_barrio:     perfilRes.data.id_barrio     || "",
          direccion:     perfilRes.data.direccion     || "",
          ciudad:        perfilRes.data.ciudad        || "Medellín",
        });
      }
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
      setCargando(false);
    });
  }, [usuario, navigate]);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter((b) => b.zona === zona) : barrios);
    setForm((f) => ({ ...f, id_barrio: "" }));
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      const { data } = await api.put("/clientes/mi-perfil", form);
      setPerfil(data);
      actualizarUsuario({ nombre: data.nombre });
      setShowModalSteps(false);
      showToast("✅ Perfil actualizado correctamente");
    } catch (err) {
      alert("Error al guardar: " + (err.response?.data?.message || "Error"));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const validarPasoDatos = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacion = () => true;

  const validarPasoClasificacion = () => true;

  const handlePagoConfirmado = ({ id_venta, cuotaId, estaCompleto, nuevoTotalPagado }) => {
    const actualizarPedido = (p) => {
      if (p.id_venta !== id_venta) return p;
      const abonosActualizados = p.abonos?.map((a) => {
        if (cuotaId) return a.id_pago === cuotaId ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
        return a.estado === "Pendiente" ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
      });
      return { ...p, total_pagado: nuevoTotalPagado, estado: estaCompleto ? "Pagado" : "Abonado", abonos: abonosActualizados };
    };
    setPedidos((prev) => prev.map(actualizarPedido));
    setDetalleModal((prev) => prev ? actualizarPedido(prev) : null);
    showToast(estaCompleto ? "✅ ¡Pedido pagado completamente!" : "✅ Abono registrado con éxito");
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const cargarDetallePedido = async (pedido) => {
    try {
      const { data } = await api.get(`/ventas/${pedido.id_venta}`);
      setDetallesPedidos((prev) => ({ ...prev, [pedido.id_venta]: data }));
      setDetalleModal(pedido);
    } catch {
      setDetalleModal(pedido);
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "Pagado": case "Confirmado": case "Abonado": return "exito";
      case "Pendiente": return "pendiente";
      case "Cancelado": return "error";
      default: return "info";
    }
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  const getInitials = (nombre) => {
    if (!nombre) return "?";
    return nombre.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
  };

  const getBarrioNombre = (id) => {
    const b = barrios.find((b) => b.id_barrio === id);
    return b ? b.nombre : null;
  };

  const totalCompras  = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalPagado   = pedidos.reduce((s, p) => s + Number(p.total_pagado || 0), 0);
  const totalPendiente = totalCompras - totalPagado;
  const countPagados  = pedidos.filter((p) => ["Pagado", "Confirmado", "Abonado"].includes(p.estado)).length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const camposPerfil = [
    { label: "Nombre",    key: "nombre"    },
    { label: "Tipo doc.", key: "tipo_doc"  },
    { label: "Documento", key: "documento" },
    { label: "Teléfono",  key: "telefono"  },
    { label: "Email",     key: "email"     },
    { label: "Ciudad",    key: "ciudad"    },
    { label: "Barrio",    key: "id_barrio" },
    { label: "Dirección", key: "direccion" },
  ];

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label>
        <input
          className={`ms-form-input${errores.nombre ? " input-error" : ""}`}
          placeholder="Ej: Juan Pérez"
          value={form.nombre || ""}
          onChange={(e) => {
            setForm({ ...form, nombre: e.target.value });
            if (errores.nombre) setErrores(prev => ({ ...prev, nombre: "" }));
          }}
        />
        {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Tipo documento</label>
          <select className="ms-form-select" value={form.tipo_doc || "CC"} disabled title="El documento no se puede modificar" onChange={(e) => setForm({ ...form, tipo_doc: e.target.value })}>
            {["CC", "CE", "TI", "NIT", "Pasaporte"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">N° documento <span className="ms-req">*</span></label>
          <input
            className={`ms-form-input${errores.documento ? " input-error" : ""}`}
            placeholder="123456789"
            value={form.documento || ""}
            disabled
            title="El documento no se puede modificar"
            onChange={(e) => {
              setForm({ ...form, documento: e.target.value });
              if (errores.documento) setErrores(prev => ({ ...prev, documento: "" }));
            }}
          />
          {errores.documento && <span className="ms-form-error">{errores.documento}</span>}
        </div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Teléfono</label>
          <input className="ms-form-input" placeholder="3001234567" inputMode="numeric" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: soloDigitos(e.target.value) })} />
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Correo electrónico</label>
          <input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
    </div>
  );

  const PasoUbicacion = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Ciudad</label>
        <input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} />
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Zona / Área</label>
          <select className="ms-form-select" onChange={(e) => handleZona(e.target.value)}>
            <option value="">— Todas las zonas —</option>
            {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Barrio</label>
          <select className="ms-form-select" value={form.id_barrio || ""} onChange={(e) => setForm({ ...form, id_barrio: Number(e.target.value) })}>
            <option value="">— Seleccionar —</option>
            {barFiltrados.map((b) => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Dirección completa</label>
        <input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion || ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
      </div>
    </div>
  );

  if (cargando) return <Loader text="Cargando tu cuenta..." />;

  return (
    <div className="mi-cuenta">
      {toastMsg && <div className="dvna-toast">{toastMsg}</div>}

      <div className="mi-cuenta-header">
        <div>
          <h1 className="mi-cuenta-title">
            ¡Hola, {usuario?.nombre?.split(" ")[0] || "cliente"}!
          </h1>
        </div>
        <span className="mi-cuenta-date">{today}</span>
      </div>

      {/* ── Perfil ── */}
      <div className="mc-card" style={{ marginBottom: 16 }}>
        {perfil ? (
          <>
            <div className="profile-top-row">
              <div className="profile-avatar">
                <span className="profile-initials">{getInitials(perfil.nombre || usuario?.nombre)}</span>
              </div>
              <div className="profile-right">
                <p className="profile-name">{perfil.nombre || usuario?.nombre}</p>
                {perfil.documento && <p className="profile-doc">CC {perfil.documento}</p>}
                <div className="profile-stats-row">
                  {[
                    { value: pedidos.length,    label: pedidos.length === 1 ? "pedido" : "pedidos" },
                    { value: fmt(totalCompras), label: "total compras" },
                    { value: fmt(totalPagado),  label: "total pagado"  },
                    { value: countPagados,      label: countPagados === 1 ? "pagado" : "pagados" },
                  ].map((stat, i, arr) => (
                    <div key={i} className="profile-stats-group">
                      <div className="profile-stat-item">
                        <span className="profile-stat-value">{stat.value}</span>
                        <span className="profile-stat-label">{stat.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="profile-stat-divider" />}
                    </div>
                  ))}
                </div>
                <button className="btn profile-edit-btn" onClick={() => setShowModalSteps(true)}>
                  Editar perfil
                </button>
              </div>
            </div>
            <div className="profile-fields-grid">
              {camposPerfil.map(({ label, key }) => (
                <div key={key} className="profile-field-item">
                  <label className="profile-field-label">{label}</label>
                  <p className="profile-field-value">
                    {key === "id_barrio"
                      ? getBarrioNombre(perfil[key]) || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>
                      : perfil[key] || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>No se pudo cargar la información del perfil.</p>
        )}
      </div>

      {/* ── Estado de cuenta ── */}
      <div className="mc-card mc-estado-cuenta" style={{ marginBottom: 16 }}>
        <h3 className="mc-card-title">Estado de cuenta</h3>
        <div className="mc-estado-grid">
          <div className="mc-estado-item">
            <span className="mc-estado-label">Total compras</span>
            <span className="mc-estado-value">{fmt(totalCompras)}</span>
          </div>
          <div className="mc-estado-item">
            <span className="mc-estado-label">Total pagado</span>
            <span className="mc-estado-value mc-estado-pagado">{fmt(totalPagado)}</span>
          </div>
          <div className="mc-estado-item">
            <span className="mc-estado-label">Saldo pendiente</span>
            <span className={`mc-estado-value ${totalPendiente > 0 ? 'mc-estado-pendiente' : 'mc-estado-pagado'}`}>
              {fmt(totalPendiente)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pedidos ── */}
      <div className="mc-card">
        <h3 className="mc-card-title">Tus pedidos</h3>
        <p className="mc-card-subtitle">Historial de compras</p>

        {pedidos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconShoppingCart /></div>
            <h4 className="empty-state-title">Aún no tienes pedidos</h4>
            <p className="empty-state-text">Explora nuestro catálogo y encuentra lo que buscas</p>
            <a href="/catalogo" className="btn-primary">Ver catálogo</a>
          </div>
        ) : (
          <div className="tbl-container">
            <table className="tbl">
              <thead className="tbl-header">
                <tr>
                  <th className="tbl-th">#</th>
                  <th className="tbl-th">Productos</th>
                  <th className="tbl-th">Total</th>
                  <th className="tbl-th">Pagado</th>
                  <th className="tbl-th">Tipo</th>
                  <th className="tbl-th">Fecha</th>
                  <th className="tbl-th">Estado</th>
                  <th className="tbl-th">Pagar</th>
                  <th className="tbl-th">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido, idx) => {
                  const abonosConfirmados = pedido.abonos?.filter((a) => a.estado === "Confirmado").length || 0;
                  const esCuotas   = pedido.tipo_pago === "cuotas";
                  const restante   = Number(pedido.total || 0) - Number(pedido.total_pagado || 0);
                  const puedePagar = restante > 0 && pedido.estado !== "Cancelado";
                  const textoTipo  = esCuotas ? `${abonosConfirmados}/${pedido.num_cuotas}` : "Completo";

                  return (
                    <tr key={pedido.id_venta} className="tbl-row">
                      <td className="tbl-td">{idx + 1}</td>
                      <td className="tbl-td">{pedido.items?.map((i) => i.producto).join(", ") || "Sin productos"}</td>
                      <td className="tbl-td">{fmt(pedido.total)}</td>
                      <td className="tbl-td">{fmt(pedido.total_pagado || 0)}</td>
                      <td className="tbl-td">
                        <span className={`badge ${esCuotas ? "badge-info" : "badge-secondary"}`}>{textoTipo}</span>
                      </td>
                      <td className="tbl-td">{new Date(pedido.fecha).toLocaleDateString("es-CO")}</td>
                      <td className="tbl-td">
                        <span className={`badge ${getBadgeClass(pedido.estado)}`}>{pedido.estado}</span>
                      </td>
                      <td className="tbl-td">
                        {puedePagar ? (
                          <button className="tbl-action-btn tbl-action-btn--pay" onClick={() => setPagoModal(pedido)}>
                            <IconCreditCard /> Pagar
                          </button>
                        ) : (
                          <span className="tbl-disabled">
                            {pedido.estado === "Cancelado" ? "Cancelado" : "Al día"}
                          </span>
                        )}
                      </td>
                      <td className="tbl-td">
                        <button className="tbl-action-btn tbl-action-btn--view" onClick={() => cargarDetallePedido(pedido)}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {showModalSteps && (
        <ModalSteps
          titulo="Editar perfil"
          pasos={["Datos personales", "Ubicación"]}
          onClose={() => setShowModalSteps(false)}
          onGuardar={guardarCambios}
          validaciones={[validarPasoDatos, validarPasoUbicacion]}
          labelGuardar="Actualizar"
          guardando={guardando}
        >
          {PasoDatos}
          {PasoUbicacion}
        </ModalSteps>
      )}

      {pagoModal && (
        <PaymentModal
          pedido={pagoModal}
          cliente={perfil}
          onClose={() => setPagoModal(null)}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}

      {detalleModal && (
        <OrderDetailModal
          pedido={detallesPedidos[detalleModal.id_venta] || detalleModal}
          onClose={() => {
            setDetalleModal(null);
            setDetallesPedidos((prev) => {
              const newObj = { ...prev };
              delete newObj[detalleModal.id_venta];
              return newObj;
            });
          }}
        />
      )}
    </div>
  );
}