// src/pages/notFound/NotFound.jsx
import { Link } from "react-router-dom";
import "./NotFound.css";
import logo from "../../assets/LOGO.png";

export default function NotFound() {
  return (
    <div className="nf-page">
      <div className="nf-card">
        <img src={logo} alt="SportWear" className="nf-logo" />
        <span className="nf-code">404</span>
        <h1 className="nf-title">Página no encontrada</h1>
        <p className="nf-text">La página que buscas no existe o fue movida.</p>
        <Link to="/" className="nf-btn">Volver al inicio</Link>
      </div>
    </div>
  );
}
