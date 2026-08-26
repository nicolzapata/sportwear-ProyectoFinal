import { IconX, IconChevronLeft, IconChevronRight } from "./detalleProductoIcons";

export default function PreviewOverlay({ imgUrls, imgActiva, total, prev, next, onClose }) {
  return (
    <div className="dp-preview-overlay" onClick={onClose}>
      <button className="dp-preview-close" onClick={onClose}>
        <IconX />
      </button>
      {total > 1 && (
        <>
          <button className="dp-preview-arrow dp-preview-arrow-left"
            onClick={(e) => { e.stopPropagation(); prev(); }}>
            <IconChevronLeft />
          </button>
          <button className="dp-preview-arrow dp-preview-arrow-right"
            onClick={(e) => { e.stopPropagation(); next(); }}>
            <IconChevronRight />
          </button>
        </>
      )}
      <img
        className="dp-preview-img"
        src={imgUrls[imgActiva]}
        alt="Vista ampliada"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
