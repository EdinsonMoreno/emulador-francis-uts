// Emblema animado para la portada: un rodete Francis girando, pensado para ir
// recortado dentro del rombo (clip-path) de la diapositiva de título.
export function drawRunnerEmblem(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.34;

  // Fondo radial profundo
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(18, 42, 74, 0.95)');
  g.addColorStop(1, 'rgba(8, 14, 32, 0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Rodete girando
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.006);

  // Corona (banda) exterior
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // Álabes curvos
  const blades = 13;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const grad = ctx.createLinearGradient(0, 0, R * Math.cos(a), R * Math.sin(a));
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.95)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0.5)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(R * 0.28 * Math.cos(a), R * 0.28 * Math.sin(a));
    ctx.quadraticCurveTo(
      R * 0.66 * Math.cos(a - 0.42),
      R * 0.66 * Math.sin(a - 0.42),
      R * 0.95 * Math.cos(a - 0.72),
      R * 0.95 * Math.sin(a - 0.72),
    );
    ctx.stroke();
  }
  ctx.restore();

  // Cubo / eje central
  const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
  hub.addColorStop(0, 'rgba(203, 213, 225, 0.95)');
  hub.addColorStop(1, 'rgba(51, 65, 85, 0.95)');
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
