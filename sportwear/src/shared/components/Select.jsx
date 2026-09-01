import { useEffect, useRef, useState } from "react";
import "./Select.css";

// Reemplazo del <select> nativo del navegador (cuyo menú desplegado no se
// puede re-estilizar de forma consistente entre navegadores) por un
// dropdown propio con el mismo aspecto que el resto del sitio.
//
// Se usa con la misma API que un <select> nativo: children de <option>,
// value/onChange (onChange recibe un evento con e.target.value, igual que
// el nativo), className, disabled, title. Así los sitios que lo usan
// cambian solo la etiqueta, sin tocar su lógica.
function parseOptions(children) {
  const opciones = [];
  const nodos = Array.isArray(children) ? children.flat(Infinity) : [children];
  for (const nodo of nodos) {
    if (!nodo || typeof nodo !== "object") continue;
    if (nodo.type === "option") {
      opciones.push({
        value: nodo.props.value !== undefined ? String(nodo.props.value) : String(nodo.props.children),
        label: nodo.props.children,
        disabled: !!nodo.props.disabled,
      });
    } else if (nodo.type === "optgroup") {
      const hijos = Array.isArray(nodo.props.children) ? nodo.props.children.flat(Infinity) : [nodo.props.children];
      hijos.forEach((h) => {
        if (h && h.type === "option") {
          opciones.push({
            value: h.props.value !== undefined ? String(h.props.value) : String(h.props.children),
            label: h.props.children,
            disabled: !!h.props.disabled,
          });
        }
      });
    }
  }
  return opciones;
}

export default function Select({
  children, value, onChange, className = "", disabled, title, placeholder, name, id, required,
}) {
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);
  const opciones = parseOptions(children);
  const seleccionada = opciones.find((o) => o.value === String(value));

  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    const onEsc = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", onClickFuera);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickFuera);
      document.removeEventListener("keydown", onEsc);
    };
  }, [abierto]);

  const elegir = (opt) => {
    if (opt.disabled) return;
    setAbierto(false);
    onChange?.({ target: { value: opt.value, name } });
  };

  return (
    <div className={`ui-select-wrap ${abierto ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        required={required}
        className={`ui-select-trigger ${className}`}
        onClick={() => !disabled && setAbierto((o) => !o)}
      >
        <span className="ui-select-value">{seleccionada ? seleccionada.label : (placeholder || "")}</span>
        <svg className="ui-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {abierto && (
        <ul className="ui-select-panel" role="listbox">
          {opciones.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === String(value)}
              className={`ui-select-option ${opt.value === String(value) ? "is-selected" : ""} ${opt.disabled ? "is-disabled" : ""}`}
              onClick={() => elegir(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
