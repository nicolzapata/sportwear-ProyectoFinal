import { useEffect, useRef } from "react";
import { loadChartJs, CHARCOAL, BROWN, LIGHT } from "../../utils/dashboardHelpers";

export default function DonutChart({ pagado, pendiente, cancelado }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
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
            backgroundColor: [CHARCOAL, BROWN, LIGHT],
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
  }, [pagado, pendiente, cancelado]);

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
        <span><span className="donut-legend-dot" style={{ background: CHARCOAL }} />Pagado</span>
        <span><span className="donut-legend-dot" style={{ background: BROWN }} />Pendiente</span>
        <span><span className="donut-legend-dot" style={{ background: LIGHT }} />Cancelado</span>
      </div>
    </div>
  );
}
