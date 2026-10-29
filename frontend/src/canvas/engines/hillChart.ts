// Diagrama de colina (Hill Chart) auténtico: mapa de iso-eficiencia en el plano
// Caudal–Salto. El rendimiento es una "campana" (gaussiana) centrada en el punto
// de mejor eficiencia (BEP); sus curvas de nivel son elipses concéntricas.
// La física (la función de rendimiento) vive acá y la usa también la escena.

// Punto de mejor eficiencia, en coordenadas normalizadas del plot [0..1].
const Q_BEP = 0.56;
const H_BEP = 0.6;
const SIG_Q = 0.27;
const SIG_H = 0.32;
const ETA_MAX = 0.93;

/** Rendimiento en el punto (qN, hN) normalizado [0..1]. Single source of truth. */
export function hillEfficiency(qN: number, hN: number): number {
  const dq = (qN - Q_BEP) / SIG_Q;
  const dh = (hN - H_BEP) / SIG_H;
  return ETA_MAX * Math.exp(-0.5 * (dq * dq + dh * dh));
}

function effColor(eta: number, alpha = 1): string {
  // Escala azul oscuro → cian → verde según el rendimiento.
  const t = Math.max(0, Math.min((eta - 0.3) / (ETA_MAX - 0.3), 1));
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const k = t / 0.5; // azul → cian
    r = 30 + (14 - 30) * k;
    g = 41 + (165 - 41) * k;
    b = 59 + (190 - 59) * k;
  } else {
    const k = (t - 0.5) / 0.5; // cian → verde
    r = 14 + (16 - 14) * k;
    g = 165 + (185 - 165) * k;
    b = 190 + (129 - 190) * k;
  }
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

export function drawHillChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  qN: number,
  hN: number,
) {
  ctx.clearRect(0, 0, width, height);

  const margin = 64;
  const cx = margin;
  const cy = margin;
  const plotW = width - margin * 2;
  const plotH = height - margin * 2;

  const toX = (q: number) => cx + q * plotW;
  const toY = (hh: number) => cy + (1 - hh) * plotH; // h crece hacia arriba

  // --- Campo de iso-eficiencia (colormap por celdas) ---
  const step = 10;
  for (let px = 0; px < plotW; px += step) {
    for (let py = 0; py < plotH; py += step) {
      const q = px / plotW;
      const hh = 1 - py / plotH;
      ctx.fillStyle = effColor(hillEfficiency(q, hh), 0.9);
      ctx.fillRect(cx + px, cy + py, step + 1, step + 1);
    }
  }

  // --- Curvas de iso-eficiencia (elipses concéntricas) ---
  const levels = [
    { eta: 0.9, label: '90%', color: '#bbf7d0' },
    { eta: 0.85, label: '85%', color: '#86efac' },
    { eta: 0.8, label: '80%', color: '#fde68a' },
    { eta: 0.7, label: '70%', color: '#fca5a5' },
    { eta: 0.6, label: '60%', color: '#fca5a5' },
  ];
  const bx = toX(Q_BEP);
  const by = toY(H_BEP);
  for (const lv of levels) {
    if (lv.eta >= ETA_MAX) continue;
    const k = Math.sqrt(-2 * Math.log(lv.eta / ETA_MAX)); // factor de radio
    const rx = SIG_Q * k * plotW;
    const ry = SIG_H * k * plotH;
    ctx.strokeStyle = lv.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = lv.color;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(lv.label, bx + rx - 4, by - 3);
  }

  // --- Zona de cavitación (alto caudal / bajo salto: abajo-derecha) ---
  ctx.fillStyle = 'rgba(239,68,68,0.22)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.ellipse(toX(0.66), toY(0.22), plotW * 0.15, plotH * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fecaca';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAVITACIÓN', toX(0.66), toY(0.22));
  ctx.textAlign = 'left';

  // --- Marco y ejes ---
  ctx.strokeStyle = 'rgba(148,163,184,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, cy, plotW, plotH);
  // Etiquetas de eje DENTRO del gráfico (con sombra para legibilidad), así no se
  // cortan en los bordes ni chocan con los sliders.
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 17px ui-sans-serif, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 5;
  ctx.textAlign = 'left';
  ctx.fillText('Caudal  Q  →', cx + 16, cy + plotH - 16);
  ctx.translate(cx + 26, cy + plotH * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Salto / Carga  H  →', 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  // --- Punto de mejor eficiencia (BEP) ---
  ctx.fillStyle = '#bbf7d0';
  ctx.strokeStyle = '#052e16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx - 7, by);
  ctx.lineTo(bx + 7, by);
  ctx.moveTo(bx, by - 7);
  ctx.lineTo(bx, by + 7);
  ctx.stroke();
  ctx.font = 'bold 13px monospace';
  ctx.fillText('BEP (máx. η)', bx + 10, by + 14);

  // --- Punto de operación actual ---
  const ox = toX(qN);
  const oy = toY(hN);
  const eta = hillEfficiency(qN, hN);
  ctx.beginPath();
  ctx.arc(ox, oy, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`η = ${(eta * 100).toFixed(1)}%`, ox + 14, oy - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '14px monospace';
  ctx.fillText('Pto. operación', ox + 14, oy + 8);
}
