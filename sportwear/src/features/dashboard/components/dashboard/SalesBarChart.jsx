import { useEffect, useRef } from "react";
import { loadChartJs, formatCurrency, getChartPalette } from "../../utils/dashboardHelpers";
import { useTheme } from "../../../../shared/contexts/ThemeContext";

// ── Gráfico de onda (área suave) — antes era de barras; ahora usa
// type:"line" + tension + fill con un gradiente de canvas, y recolorea al
// alternar claro/oscuro (los colores del canvas no son reactivos a CSS, así
// que el chart se reconstruye cuando cambia el tema). Recibe directamente
// los valores + la etiqueta del período. ──
export default function SalesBarChart({ labels, values, seriesLabel }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    let destroyed = false;
    const paleta = getChartPalette(theme);
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const ctx = canvasRef.current.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, paleta.fillFrom);
      gradient.addColorStop(1, paleta.fillTo);

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: seriesLabel,
            data: values,
            borderColor: paleta.line,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: paleta.line,
            pointHoverBorderColor: paleta.tooltipBg,
            pointHoverBorderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: paleta.tooltipBg,
              borderColor: paleta.tooltipBorder,
              borderWidth: 1,
              titleColor: paleta.tooltipTitle,
              bodyColor: paleta.tooltipBody,
              cornerRadius: 8,
              padding: 10,
              callbacks: { label: (ctx) => `  ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: paleta.ticks, font: { family: "'Jost', sans-serif", size: 10 } },
            },
            y: {
              grid: { color: paleta.grid },
              border: { display: false, dash: [3, 3] },
              ticks: {
                color: paleta.ticks,
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
  }, [labels, values, seriesLabel, theme]);

  return <div style={{ position: "relative", flex: 1, minHeight: 160 }}><canvas ref={canvasRef} /></div>;
}
