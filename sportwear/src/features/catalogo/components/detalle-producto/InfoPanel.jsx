import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconCart, IconCheck, IconMinus, IconPlus,
  IconChevronDown, IconCareTag, IconTruckShip, IconZap,
} from "./detalleProductoIcons";
import { fmt } from "../../utils/detalleProductoHelpers";

// ── Acordeón genérico: "Composición & Cuidados" y "Envíos y cambios" son
// contenido general de la tienda (no hay campos de composición/tiro por
// producto en la base de datos), así que su texto es fijo — solo el estado
// abierto/cerrado es dinámico. ──
function Acordeon({ icono, titulo, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={`dp-accordion${abierto ? " abierto" : ""}`}>
      <button type="button" className="dp-accordion-head" onClick={() => setAbierto(v => !v)}>
        <span className="dp-accordion-head-left">
          <span className="dp-accordion-icon">{icono}</span>
          {titulo}
        </span>
        <IconChevronDown />
      </button>
      {abierto && <div className="dp-accordion-body">{children}</div>}
    </div>
  );
}

export default function InfoPanel({
  producto, colores, tallas, colorSel, tallaSel, variantes,
  handleColorClick, handleTallaClick,
  precioMostrado, sinSeleccion, agotado, stockMostrado,
  cantidad, decrementar, incrementar,
  agregado, handleAgregar, handleComprarAhora,
}) {
  const referencia = `#${String(producto.id_producto).padStart(6, "0")}`;
  const navigate = useNavigate();

  return (
    <div className="dp-info">
      <nav className="dp-breadcrumb" aria-label="Ruta de navegación">
        <span className="dp-breadcrumb-link" onClick={() => navigate("/catalogo")}>Inicio</span>
        {producto.categoria && (
          <>
            <span className="dp-breadcrumb-sep">/</span>
            <span>{producto.categoria}</span>
          </>
        )}
        <span className="dp-breadcrumb-sep">/</span>
        <span>Ref: {referencia}</span>
      </nav>

      <div className="dp-meta-row">
        <span className="dp-meta-tag">SPORTWEAR{producto.categoria ? ` • ${producto.categoria.toUpperCase()}` : ""}</span>
        <span className="dp-meta-ref">Ref: {referencia}</span>
      </div>

      <h1 className="dp-nombre">{producto.nombre}</h1>

      <div className="dp-price-box">
        <div>
          <span className="dp-price-label">Precio de lanzamiento</span>
          <div className="dp-precio-wrap">
            <span className="dp-precio">{fmt(precioMostrado)}</span>
            <span className="dp-precio-moneda">COP</span>
          </div>
        </div>
        {!sinSeleccion && (
          <span className={`dp-stock-pill${agotado ? " agotada" : stockMostrado < 5 ? " baja" : ""}`}>
            <span className="dp-stock-dot" />
            {agotado ? "Sin stock" : `Stock: ${stockMostrado} unidades`}
          </span>
        )}
      </div>

      {colores.length > 0 && (
        <div className="dp-colores">
          <div className="dp-attr-header">
            <span className="dp-attr-label">
              Color seleccionado: <span className="dp-attr-val">{colorSel?.nombre ?? "—"}</span>
            </span>
            <span className="dp-attr-count">
              {colores.length} {colores.length === 1 ? "tono disponible" : "tonos disponibles"}
            </span>
          </div>
          <div className="dp-color-chips-row">
            {colores.map(c => (
              <button
                key={c.id_color}
                title={c.nombre}
                className={`dp-color-chip-btn${colorSel?.id_color === c.id_color ? " selected" : ""}`}
                style={{ background: c.codigo_hex || "#ccc" }}
                onClick={() => handleColorClick(c)}
              />
            ))}
          </div>
        </div>
      )}

      {tallas.length > 0 && (
        <div className="dp-tallas">
          <span className="dp-attr-label">Talla: <span className="dp-attr-val">{tallaSel ?? "—"}</span></span>
          <div className="dp-talla-chips-row">
            {tallas.map(t => {
              const varT     = variantes.find(v => v.id_color === colorSel?.id_color && v.talla === t);
              const sinStock = Number(varT?.stock ?? 0) === 0;
              return (
                <button
                  key={t}
                  className={`dp-talla-chip${tallaSel === t ? " selected" : ""}${sinStock ? " agotada" : ""}`}
                  onClick={() => !sinStock && handleTallaClick(t)}
                  title={sinStock ? "Agotada" : t}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sinSeleccion && (
        <div className="dp-stock-row">
          <span className="dp-stock-out" style={{ fontStyle: "italic" }}>Selecciona color y talla</span>
        </div>
      )}

      {!agotado && !sinSeleccion && <span className="dp-cantidad-label">Cantidad:</span>}

      <div className="dp-action-row">
        {!agotado && !sinSeleccion && (
          <div className="dp-cantidad-controls">
            <button className="dp-cantidad-btn" onClick={decrementar} disabled={cantidad <= 1}>
              <IconMinus />
            </button>
            <span className="dp-cantidad-value">{cantidad}</span>
            <button className="dp-cantidad-btn" onClick={incrementar} disabled={cantidad >= stockMostrado}>
              <IconPlus />
            </button>
          </div>
        )}

        <button
          className={`dp-btn-agregar${agregado ? " agregado" : ""}${(agotado || sinSeleccion) ? " disabled" : ""}`}
          onClick={handleAgregar}
          disabled={agotado || sinSeleccion}
        >
          {agregado
            ? <><IconCheck /> ¡Agregado!</>
            : agotado
              ? "Agotado"
              : sinSeleccion
                ? "Selecciona color y talla"
                : <><IconCart /> Agregar al carrito</>
          }
        </button>
      </div>

      <button
        className="dp-btn-comprar-ya"
        onClick={handleComprarAhora}
        disabled={agotado || sinSeleccion}
      >
        <IconZap /> Comprar ahora con 1 clic (envío express)
      </button>

      {producto.descripcion && (
        <div className="dp-desc-section">
          <h2 className="dp-desc-title">Descripción</h2>
          <p className="dp-desc-text">{producto.descripcion}</p>
        </div>
      )}
    </div>
  );
}
