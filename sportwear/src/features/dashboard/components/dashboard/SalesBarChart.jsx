import { useEffect, useRef } from "react";
import { loadChartJs, formatCurrency, CHARCOAL, MUTED, BORDER } from "../../utils/dashboardHelpers";

// ── Gráfico de barras — ahora recibe directamente los valores + la etiqueta del período
// (antes ignoraba silenciosamente "previous" y el botón "Mensual" no hacía nada) ──
export default function SalesBarChart({ labels, values, seriesLabel }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    let destroyed = false;
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: seriesLabel,
            data: values,
            backgroundColor: CHARCOAL,
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#fff",
              borderColor: BORDER,
              borderWidth: 1,
              titleColor: CHARCOAL,
              bodyColor: MUTED,
              cornerRadius: 8,
              padding: 10,
              callbacks: { label: (ctx) => `  ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: MUTED, font: { family: "'Jost', sans-serif", size: 10 } },
            },
            y: {
              grid: { color: "#f0ede8" },
              border: { display: false, dash: [3, 3] },
              ticks: {
                color: MUTED,
                font: { family: "'Jost', sans-serif", size: 10 },
                maxTicksLimit: 5,
                callback: (v) => formatCurrency(v),
              },
            },
          },
        },
      });
    });
    return () => { destroyed = true; chartRef.current?.destroy(); };
  }, [labels, values, seriesLabel]);

  return <div style={{ position: "relative", flex: 1, minHeight: 160 }}><canvas ref={canvasRef} /></div>;
}
