import type { DerivedQuantities } from '../../types';

interface Vec2 {
  x: number;
  y: number;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  to: Vec2,
  color: string,
  label: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLen = 12;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - 0.4),
    to.y - headLen * Math.sin(angle - 0.4),
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + 0.4),
    to.y - headLen * Math.sin(angle + 0.4),
  );
  ctx.closePath();
  ctx.fill();

  // Etiqueta en el punto medio del vector, ligeramente desplazada.
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(label, mx + 8, my - 8);
  ctx.restore();
}

/**
 * Triángulo de velocidades a la entrada del rodete.
 * Relación vectorial fundamental:  V = U + W
 *   U  : velocidad periférica (tangencial), de O a A
 *   V  : velocidad absoluta, de O a P
 *   W  : velocidad relativa, de A a P  (= V - U)
 * Vu y Vm son las componentes tangencial y meridional de V.
 */
export function drawVelocityTriangle(
  ctx: CanvasRenderingContext2D,
  d: DerivedQuantities,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);

  // Escala automática para que el vector más largo ocupe ~55% del menor lado.
  const maxVel = Math.max(d.U, d.V, d.W, 1);
  const scale = (Math.min(width, height) * 0.55) / maxVel;

  // Origen O: centrado horizontalmente respecto al lado U, hacia abajo.
  const O: Vec2 = { x: width / 2 - (d.U * scale) / 2, y: height * 0.62 };

  // Vértices del triángulo (y crece hacia abajo => Vm va hacia arriba: signo -).
  const A: Vec2 = { x: O.x + d.U * scale, y: O.y }; // punta de U (tangencial)
  const P: Vec2 = { x: O.x + d.Vu * scale, y: O.y - d.Vm * scale }; // punta de V

  // Línea de referencia tangencial (dirección de giro del rodete).
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(O.x - 30, O.y);
  ctx.lineTo(Math.max(A.x, P.x) + 40, O.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Componente meridional Vm (vertical, punteada) y tangencial Vu (sobre la base).
  const Pvu: Vec2 = { x: O.x + d.Vu * scale, y: O.y };
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(Pvu.x, O.y);
  ctx.lineTo(P.x, P.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Marca del ángulo α entre la línea tangencial y V (pequeño arco).
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(O.x, O.y, 34, -Math.atan2(d.Vm, d.Vu), 0);
  ctx.stroke();
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'italic 16px serif';
  ctx.fillText('α', O.x + 42, O.y - 10);

  // Vectores principales (colores vibrantes sobre fondo oscuro).
  drawArrow(ctx, O, A, '#22c55e', 'U'); // periférica → verde
  drawArrow(ctx, A, P, '#facc15', 'W'); // relativa → amarillo (cierra el triángulo)
  drawArrow(ctx, O, P, '#ef4444', 'V'); // absoluta → rojo
  drawArrow(ctx, O, Pvu, '#22d3ee', 'Vu'); // componente de giro → cian
}
