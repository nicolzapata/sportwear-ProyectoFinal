import { formatFechaCorta } from "../../utils/dashboardHelpers";

// ── NUEVO: textito chiquito de "de qué fecha a qué fecha" — se repite en
// cada tarjeta/sección que sí queda filtrada, para que quede clarísimo
// qué se está viendo sin tener que adivinar. ──
export default function RangoTexto({ reporte }) {
  if (!reporte) return null;
  return (
    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-circle)", fontWeight: 500 }}>
      Del {formatFechaCorta(reporte.desde)} al {formatFechaCorta(reporte.hasta)}
    </span>
  );
}
