// ── Bloque reutilizable de la alerta de stock + sugerencias ──
export default function StockAlerta({ errorStock, elegirAlternativa }) {
  if (!errorStock) return null;

  return (
    <div className="checkout-stock-alerta">
      <p className="checkout-stock-alerta-titulo">
        Sin stock suficiente de "{errorStock.producto}" — pediste {errorStock.solicitado}, hay {errorStock.disponible} disponibles.
      </p>
      {errorStock.alternativas?.length > 0 ? (
        <>
          <p className="checkout-stock-alerta-sub">Elige otra opción disponible para reemplazarla:</p>
          <div className="checkout-stock-alternativas">
            {errorStock.alternativas.map((alt) => (
              <button
                key={alt.id_variante}
                type="button"
                className="checkout-stock-alt-btn"
                onClick={() => elegirAlternativa(alt)}
              >
                {alt.talla}{alt.color ? ` · ${alt.color}` : ""}
                <span className="checkout-stock-alt-stock">{alt.stock} disp.</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="checkout-stock-alerta-sub">
          No hay otras tallas o colores disponibles para este producto ahora mismo. Ajusta la cantidad o quítalo del carrito e inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
