// src/pages/clientes/MiCuenta.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import PaymentModal from "../../ventas/components/PaymentModal";
import OrderDetailModal from "../../ventas/components/OrderDetailModal";
import { IconCreditCard, IconShoppingCart, IconDollar, IconBox, IconTruck } from "../../../shared/components/Icons";
import Loader from "../../../shared/components/Loader";
import { soloDigitos, validarTelefono, validarNombre, validarEmail, LONGITUD_TELEFONO } from "../../../shared/utils/numerico";
import "./MiCuenta.css";

const IconImagenVacia = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="m9 9 6 6m0-6-6 6"/>
  </svg>
);
const IconXModal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── NUEVO: cuántos pedidos se muestran de una en la página — el resto vive
// en la ventana "Ver todos mis pedidos", para que Mi Cuenta no se vuelva un
// scroll interminable con clientes que tienen muchos pedidos. ──
const PEDIDOS_VISIBLES_INLINE = 3;

// "nombre" completo (BD) -> primer palabra = nombres, resto = apellidos.
const dividirNombre = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
};

const errorEmailPerfil = (valor) => validarEmail(valor);

// ── estado del envío (distinto del estado del pago) — viene de
// "Pedidos.estado_pedido" a través de /ventas/mis-pedidos. ──
const getEnvioBadgeClass = (estado) => {
  switch (estado) {
    case "Entregado":      return "exito";
    case "Enviado":        return "info";
    case "En preparación": return "pendiente";
    case "Cancelado":      return "error";
    default:                return "pendiente"; // Pendiente o sin registrar aún
  }
};
const getEnvioTexto = (estado) => estado || "Pendiente";

export default function MiCuenta() {
  const { usuario, actualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [pedidos, setPedidos]               = useState([]);
  const [perfil, setPerfil]                 = useState(null);
  const [showModalPerfil, setShowModalPerfil] = useState(false);
  // ── NUEVO: ventana con la lista completa de pedidos ──
  const [modalTodosPedidos, setModalTodosPedidos] = useState(false);
  const [form, setForm]                     = useState({});
  const [errores, setErrores]               = useState({ nombres: "", apellidos: "", documento: "", email: "" });
  const [guardando, setGuardando]           = useState(false);
  const [cargando, setCargando]             = useState(true);
  const [barrios, setBarrios]               = useState([]);
  const [zonas, setZonas]                   = useState([]);
  const [barFiltrados, setBarFiltrados]     = useState([]);
  const [detallesPedidos, setDetallesPedidos] = useState({});
  const [pagoModal, setPagoModal]           = useState(null);
  const [detalleModal, setDetalleModal]     = useState(null);

  useEffect(() => {
    if (!usuario) { navigate("/"); return; }
    setCargando(true);
    Promise.all([
      api.get("/ventas/mis-pedidos").catch(() => ({ data: [] })),
      api.get("/clientes/mi-perfil").catch(() => ({ data: null })),
      api.get("/barrios").catch(() => ({ data: [] })),
      api.get("/barrios/zonas").catch(() => ({ data: [] })),
      // ── NUEVO: se trae la lista de productos solo para armar el mapa de
      // fotos (id_producto -> imagen_principal) — este endpoint ya se sabe
      // que funciona bien en el resto del sitio, así que no hace falta tocar
      // el backend ni adivinar de dónde sale la imagen. ──
      api.get("/productos").catch(() => ({ data: [] })),
    ]).then(([pedidosRes, perfilRes, barriosRes, zonasRes, productosRes]) => {
      const imagenPorProducto = {};
      (productosRes.data || []).forEach((p) => {
        if (p.imagen_principal) imagenPorProducto[p.id_producto] = p.imagen_principal;
      });

      // ── CORREGIDO: el pedido viene ordenado del más reciente al más
      // antiguo (para mostrar arriba lo último) — pero el NÚMERO de pedido
      // debe contar en el orden real en que se hicieron (el primero que
      // hiciste es el #1), no el orden invertido, y tampoco el ID interno
      // de venta (V-089), que revela cuántas ventas lleva la tienda en
      // total, no solo las tuyas. ──
      const filtrados = (pedidosRes.data || []).filter(
        // ── CORREGIDO: el filtro buscaba "Cancelado", pero el valor real que
        // usa Ventas.estado en todo el resto del sistema es "Anulado" — dos
        // palabras distintas para lo mismo, así que una venta anulada nunca
        // pasaba este filtro y se escondía por completo en vez de mostrarse
        // marcada como anulada. ──
        (p) => ["Confirmado", "Pagado", "Cancelado", "Anulado", "Abonado"].includes(p.estado)
      );
      const total = filtrados.length;
      const conNumeroYFotos = filtrados.map((p, i) => ({
        ...p,
        numeroPedido: total - i,
        items: (p.items || []).map((item) => ({
          ...item,
          producto_imagen: imagenPorProducto[item.id_producto] || null,
        })),
      }));
      setPedidos(conNumeroYFotos);
      if (perfilRes.data) {
        setPerfil(perfilRes.data);
        const { nombres, apellidos } = dividirNombre(perfilRes.data.nombre);
        setForm({
          nombres, apellidos,
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

  // Para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Verificación en tiempo real (onBlur): si el correo ya existe, avisa de una vez.
  // Se excluye el propio correo actual del perfil para no marcarlo como "duplicado".
  const verificarEmailDuplicado = async (email) => {
    if (perfil?.email && email.toLowerCase() === perfil.email.toLowerCase()) return;
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRef.current.email.trim() === email) {
        setErrores(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, no bloqueamos al usuario.
    }
  };

  const validarFormularioPerfil = () => {
    const e = {};
    const eNombres = validarNombre(form.nombres);
    if (eNombres) e.nombres = eNombres;
    const eApellidos = validarNombre(form.apellidos, "El apellido es obligatorio");
    if (eApellidos) e.apellidos = eApellidos;
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    const eTelefono = validarTelefono(form.telefono);
    if (eTelefono) e.telefono = eTelefono;
    const eEmail = errorEmailPerfil(form.email);
    if (eEmail) e.email = eEmail;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardarCambios = async () => {
    if (!validarFormularioPerfil()) return;
    setGuardando(true);
    const { nombres, apellidos, ...resto } = form;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      const { data } = await api.put("/clientes/mi-perfil", payload);
      setPerfil(data);
      actualizarUsuario({ nombre: data.nombre });
      setShowModalPerfil(false);
      showToast("exito", "Perfil actualizado correctamente.");
    } catch (err) {
      const mensaje = err.response?.data?.message;
      const campo = /correo|email/i.test(mensaje || "") ? "email" : /documento/i.test(mensaje || "") ? "documento" : null;
      if (err.response?.status === 409 && campo) {
        setErrores(prev => ({ ...prev, [campo]: mensaje }));
      } else {
        showToast("error", "Error al guardar: " + (mensaje || "Error"));
      }
    } finally {
      setGuardando(false);
    }
  };

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
    showToast("exito", estaCompleto ? "¡Pedido pagado completamente!" : "Abono registrado con éxito.");
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
      // ── CORREGIDO: "Cancelado" no es un valor real de Ventas.estado — el
      // que sí se usa es "Anulado" (distinto de Pedidos.estado_pedido, que
      // sí usa "Cancelado" — por eso getEnvioBadgeClass, más arriba, no se
      // toca). Se dejan los dos por seguridad, sin que ninguno estorbe. ──
      case "Cancelado": case "Anulado": return "error";
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

  // ── Tarjeta de un pedido — se reutiliza tanto en la vista compacta de la
  // página como dentro de la ventana "Ver todos mis pedidos". ──
  const PedidoCard = ({ pedido }) => {
    const abonosConfirmados = pedido.abonos?.filter((a) => a.estado === "Confirmado").length || 0;
    const esCuotas   = pedido.tipo_pago === "cuotas";
    const restante   = Number(pedido.total || 0) - Number(pedido.total_pagado || 0);
    const puedePagar = restante > 0 && pedido.estado !== "Cancelado";
    const textoTipo  = esCuotas ? `${abonosConfirmados}/${pedido.num_cuotas} cuotas` : "Pago completo";

    return (
      <div className={`mc-pedido-card${(pedido.estado === "Cancelado" || pedido.estado === "Anulado") ? " mc-pedido-card-cancelado" : ""}`}>
        <div className="mc-pedido-card-header">
          <div className="mc-pedido-card-info">
            {/* ── NUEVO: el código real de la venta se muestra junto al número
                de pedido del cliente — el número sigue siendo el conteo propio
                del cliente (no revela el total de ventas de la tienda), y el
                código sirve como referencia exacta para soporte. ── */}
            <span className="mc-pedido-card-id">
              Pedido #{pedido.numeroPedido}
              <span className="mc-pedido-card-codigo">V-{String(pedido.id_venta).padStart(3, "0")}</span>
            </span>
            <span className="mc-pedido-card-fecha">{new Date(pedido.fecha).toLocaleDateString("es-CO", { timeZone: "UTC" })}</span>
          </div>
          <div className="mc-pedido-card-badges">
            <span className={`badge ${getBadgeClass(pedido.estado)}`}>{pedido.estado}</span>
            <span className={`badge ${getEnvioBadgeClass(pedido.estado_envio)}`}>{getEnvioTexto(pedido.estado_envio)}</span>
          </div>
        </div>

        <div className="mc-pedido-card-items">
          {(pedido.items || []).map((item, i) => (
            <div key={i} className="mc-pedido-item-thumb" title={`${item.producto}${item.talla ? " · " + item.talla : ""}`}>
              {item.producto_imagen ? (
                <img src={item.producto_imagen} alt={item.producto} />
              ) : (
                <IconImagenVacia />
              )}
              {item.cantidad > 1 && <span className="mc-pedido-item-cant">×{item.cantidad}</span>}
            </div>
          ))}
        </div>

        <div className="mc-pedido-card-footer">
          <div className="mc-pedido-card-totales">
            <span className="mc-pedido-card-tipo">{textoTipo}</span>
            <span className="mc-pedido-card-total">{fmt(pedido.total)}</span>
            {Number(pedido.total_pagado || 0) > 0 && Number(pedido.total_pagado) < Number(pedido.total) && (
              <span className="mc-pedido-card-pagado">Pagado: {fmt(pedido.total_pagado)}</span>
            )}
          </div>
          <div className="mc-pedido-card-acciones">
            {puedePagar && (
              <button className="tbl-action-btn tbl-action-btn--pay" onClick={() => setPagoModal(pedido)}>
                <IconCreditCard /> Pagar
              </button>
            )}
            <button className="tbl-action-btn tbl-action-btn--view" onClick={() => cargarDetallePedido(pedido)}>
              Ver detalle
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (cargando) return <Loader text="Cargando tu cuenta..." />;

  const pedidosVisibles = pedidos.slice(0, PEDIDOS_VISIBLES_INLINE);
  const hayMasPedidos = pedidos.length > PEDIDOS_VISIBLES_INLINE;

  return (
    <div className="mi-cuenta">

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
                <button className="btn profile-edit-btn" onClick={() => setShowModalPerfil(true)}>
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
        <div className="mc-estado-grid mc-estado-grid-4">
          <div className="mc-estado-item">
            <span className="mc-estado-icon"><IconBox /></span>
            <div>
              <span className="mc-estado-label">Pedidos</span>
              <span className="mc-estado-value">{pedidos.length}</span>
            </div>
          </div>
          <div className="mc-estado-item">
            <span className="mc-estado-icon"><IconDollar /></span>
            <div>
              <span className="mc-estado-label">Total compras</span>
              <span className="mc-estado-value">{fmt(totalCompras)}</span>
            </div>
          </div>
          <div className="mc-estado-item">
            <span className="mc-estado-icon mc-estado-icon-pagado"><IconCreditCard /></span>
            <div>
              <span className="mc-estado-label">Total pagado</span>
              <span className="mc-estado-value mc-estado-pagado">{fmt(totalPagado)}</span>
            </div>
          </div>
          <div className="mc-estado-item">
            <span className={`mc-estado-icon${totalPendiente > 0 ? " mc-estado-icon-pendiente" : " mc-estado-icon-pagado"}`}><IconTruck /></span>
            <div>
              <span className="mc-estado-label">Saldo pendiente</span>
              <span className={`mc-estado-value ${totalPendiente > 0 ? 'mc-estado-pendiente' : 'mc-estado-pagado'}`}>
                {fmt(totalPendiente)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pedidos — solo los últimos 3 aquí; el resto vive en la ventana
          "Ver todos mis pedidos", para no volver esta página un scroll
          interminable con clientes que tienen muchos pedidos. ── */}
      <div className="mc-card">
        <div className="mc-card-header-row">
          <div>
            <h3 className="mc-card-title">Tus pedidos</h3>
            <p className="mc-card-subtitle">Historial de compras</p>
          </div>
          {hayMasPedidos && (
            <button className="mc-btn-secondary mc-btn-ver-todos" onClick={() => setModalTodosPedidos(true)}>
              Ver todos mis pedidos ({pedidos.length})
            </button>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconShoppingCart /></div>
            <h4 className="empty-state-title">Aún no tienes pedidos</h4>
            <p className="empty-state-text">Explora nuestro catálogo y encuentra lo que buscas</p>
            <a href="/catalogo" className="btn-primary">Ver catálogo</a>
          </div>
        ) : (
          <div className="mc-pedidos-lista">
            {pedidosVisibles.map((pedido) => (
              <PedidoCard key={pedido.id_venta} pedido={pedido} />
            ))}
          </div>
        )}
      </div>

      {/* ── Ventana "Ver todos mis pedidos" — lista completa con su propio
          scroll interno, sin alargar la página.
          NUEVO: va en un portal a document.body — así evita quedar atrapada
          dentro de ".mi-cuenta" (que deja un transform "fantasma" pegado por
          su animación de entrada, lo cual rompe position:fixed si el modal
          vive adentro). ── */}
      {modalTodosPedidos && createPortal(
        <div className="mc-modal-overlay" onClick={() => setModalTodosPedidos(false)}>
          <div className="mc-modal-box mc-modal-todos-pedidos" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header">
              <h2 className="mc-modal-title">Mis pedidos ({pedidos.length})</h2>
              <button className="mc-modal-close" onClick={() => setModalTodosPedidos(false)}><IconXModal /></button>
            </div>
            <div className="mc-modal-body mc-modal-todos-pedidos-body">
              <div className="mc-pedidos-lista">
                {pedidos.map((pedido) => (
                  <PedidoCard key={pedido.id_venta} pedido={pedido} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal editar perfil — panel único, sin pasos "Siguiente".
          NUEVO: también va por portal, mismo motivo que el de arriba. ── */}
      {showModalPerfil && createPortal(
        <div className="mc-modal-overlay" onClick={() => !guardando && setShowModalPerfil(false)}>
          <div className="mc-modal-box mc-modal-perfil" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header">
              <h2 className="mc-modal-title">Editar perfil</h2>
              <button className="mc-modal-close" onClick={() => setShowModalPerfil(false)}><IconXModal /></button>
            </div>
            <div className="mc-modal-body">
              <h3 className="mc-modal-section-title">Datos personales</h3>
              <div className="ms-form-row">
                <div className="ms-form-group">
                  <label className="ms-form-label">Nombres <span className="ms-req">*</span></label>
                  <input
                    className={`ms-form-input${errores.nombres ? " input-error" : ""}`}
                    placeholder="Ej: Juan"
                    value={form.nombres || ""}
                    onChange={(e) => {
                      const nombres = e.target.value;
                      setForm({ ...form, nombres });
                      if (errores.nombres) setErrores(prev => ({ ...prev, nombres: validarNombre(nombres) }));
                    }}
                    onBlur={() => setErrores(prev => ({ ...prev, nombres: validarNombre(form.nombres) }))}
                  />
                  {errores.nombres && <span className="ms-form-error">{errores.nombres}</span>}
                </div>
                <div className="ms-form-group">
                  <label className="ms-form-label">Apellidos <span className="ms-req">*</span></label>
                  <input
                    className={`ms-form-input${errores.apellidos ? " input-error" : ""}`}
                    placeholder="Ej: Pérez"
                    value={form.apellidos || ""}
                    onChange={(e) => {
                      const apellidos = e.target.value;
                      setForm({ ...form, apellidos });
                      if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") }));
                    }}
                    onBlur={() => setErrores(prev => ({ ...prev, apellidos: validarNombre(form.apellidos, "El apellido es obligatorio") }))}
                  />
                  {errores.apellidos && <span className="ms-form-error">{errores.apellidos}</span>}
                </div>
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
                  <label className="ms-form-label">Teléfono <span className="ms-req">*</span></label>
                  <input
                    className={`ms-form-input${errores.telefono ? " input-error" : ""}`}
                    placeholder="3001234567"
                    inputMode="numeric"
                    maxLength={LONGITUD_TELEFONO}
                    value={form.telefono || ""}
                    onChange={(e) => {
                      const telefono = soloDigitos(e.target.value);
                      setForm({ ...form, telefono });
                      if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) }));
                    }}
                    onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))}
                  />
                  {errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}
                </div>
                <div className="ms-form-group">
                  <label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label>
                  <input
                    type="email"
                    className={`ms-form-input${errores.email ? " input-error" : ""}`}
                    placeholder="ejemplo@correo.com"
                    value={form.email || ""}
                    onChange={(e) => {
                      const email = e.target.value;
                      setForm({ ...form, email });
                      if (errores.email) setErrores(prev => ({ ...prev, email: errorEmailPerfil(email) }));
                    }}
                    onBlur={() => {
                      const mensaje = errorEmailPerfil(form.email);
                      setErrores(prev => ({ ...prev, email: mensaje }));
                      if (!mensaje) {
                        const valor = form.email.trim();
                        if (valor) verificarEmailDuplicado(valor);
                      }
                    }}
                  />
                  {errores.email && <span className="ms-form-error">{errores.email}</span>}
                </div>
              </div>

              <h3 className="mc-modal-section-title" style={{ marginTop: 20 }}>Ubicación</h3>
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
            <div className="mc-modal-footer">
              <button className="mc-btn-secondary" onClick={() => setShowModalPerfil(false)} disabled={guardando}>Cancelar</button>
              <button className="btn-primary" onClick={guardarCambios} disabled={guardando}>
                {guardando ? "Guardando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
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