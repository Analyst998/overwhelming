// js/charts.js — Chart.js wrappers

const Charts = (() => {
  const instances = {}; // store chart instances to destroy on re-render

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  const BRAND_COLORS = {
    red: '#C92C35',
    redLight: 'rgba(201,44,53,0.15)',
    green: '#218F6D',
    greenLight: 'rgba(33,143,109,0.15)',
    amber: '#D97706',
    gray: '#888888',
  };

  // Line chart for weekly revenue trends
  // data: { labels: string[], datasets: [{ label, data, color }] }
  function renderRevenueChart(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((ds) => {
          const borderColor = ds.color || BRAND_COLORS.red;
          // Build a transparent fill color from the border color
          let bgColor;
          if (ds.color) {
            // If it's already rgba, just lower the alpha; if rgb, convert; if hex, use redLight fallback
            if (ds.color.startsWith('rgba')) {
              bgColor = ds.color.replace(/,\s*[\d.]+\)$/, ',0.1)');
            } else if (ds.color.startsWith('rgb(')) {
              bgColor = ds.color.replace('rgb(', 'rgba(').replace(')', ',0.1)');
            } else {
              bgColor = BRAND_COLORS.redLight;
            }
          } else {
            bgColor = BRAND_COLORS.redLight;
          }
          return {
            label: ds.label,
            data: ds.data,
            borderColor,
            backgroundColor: bgColor,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Rubik', size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${typeof formatMoneyShort === 'function' ? formatMoneyShort(ctx.raw) : ctx.raw} so'm`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) =>
                typeof formatMoneyShort === 'function' ? formatMoneyShort(v) : v,
              font: { family: 'Rubik', size: 11 },
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { font: { family: 'Rubik', size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Horizontal bar chart for division breakdown
  // data: { labels: string[], values: number[] }
  function renderDivisionChart(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            backgroundColor: BRAND_COLORS.red,
            borderRadius: 6,
            barThickness: 20,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              callback: (v) =>
                typeof formatMoneyShort === 'function' ? formatMoneyShort(v) : v,
              font: { family: 'Rubik', size: 11 },
            },
          },
          y: {
            ticks: { font: { family: 'Rubik', size: 12, weight: '500' } },
          },
        },
      },
    });
  }

  // KPI doughnut per designer
  // score: number 0–100
  function renderKpiDoughnut(canvasId, score) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const color =
      score >= 80
        ? BRAND_COLORS.green
        : score >= 60
        ? BRAND_COLORS.amber
        : BRAND_COLORS.red;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [score, 100 - score],
            backgroundColor: [color, '#F2F2F2'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        animation: { animateRotate: true, duration: 800 },
      },
    });
  }

  // Pure SVG sparkline (no Chart.js)
  // data: number[] — array of values
  // containerId: id of the element to render into
  function renderSparklineSVG(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !data || data.length < 2) return;

    const W = 80;
    const H = 28;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // avoid div by zero

    // Map data points to SVG coordinates
    const points = data.map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (W - padding * 2);
      const y = H - padding - ((v - min) / range) * (H - padding * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    // Trend: compare last value vs first
    const trending = data[data.length - 1] >= data[0];
    const strokeColor = trending ? BRAND_COLORS.green : BRAND_COLORS.red;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;">
  <polyline
    points="${points.join(' ')}"
    fill="none"
    stroke="${strokeColor}"
    stroke-width="1.8"
    stroke-linejoin="round"
    stroke-linecap="round"
  />
</svg>`;

    container.innerHTML = svg;
  }

  return {
    renderRevenueChart,
    renderDivisionChart,
    renderKpiDoughnut,
    renderSparklineSVG,
    destroy,
    BRAND_COLORS,
  };
})();
