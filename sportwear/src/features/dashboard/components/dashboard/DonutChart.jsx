import { useEffect, useRef } from "react";
import { loadChartJs, getChartPalette } from "../../utils/dashboardHelpers";
import { useTheme } from "../../../../shared/contexts/ThemeContext";

export default function DonutChart({ pagado, pendiente, cancelado }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const { theme } = useTheme();
  const paleta = getChartPalette(theme);
  const total = pagado + pendiente + cancelado || 1;
  const pct   = Math.round((pagado / total) * 100);

  useEffect(() => {
    let destroyed = false;
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "doughnut",
        data: {
          datasets: [{
            data: [pagado, pendiente, cancelado],
            backgroundColor: paleta.donut,
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: "72%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    });
    return () => { destroyed = true; chartRef.current?.destroy(); };
  }, [pagado, pendiente, cancelado, theme]);

  return (
    <div className="donut-wrap">
      <div className="donut-container">
        <canvas ref={canvasRef} />
        <div className="donut-center">
          <div className="donut-value">{pct}%</div>
          <div className="donut-label">completado</div>
        </div>
      </div>
      <div className="donut-legend">
        <span><span className="donut-legend-dot" style={{ background: paleta.donut[0] }} />Pagado</span>
        <span><span className="donut-legend-dot" style={{ background: paleta.donut[1] }} />Pendiente</span>
        <span><span className="donut-legend-dot" style={{ background: paleta.donut[2] }} />Cancelado</span>
      </div>
    </div>
  );
}
