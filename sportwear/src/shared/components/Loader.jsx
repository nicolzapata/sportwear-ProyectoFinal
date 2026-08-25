import "./Loader.css";

export default function Loader({ text = "Cargando..." }) {
  return (
    <div className="loader-container">
      <div className="loader-spinner" />
      <span className="loader-text">{text}</span>
    </div>
  );
}
