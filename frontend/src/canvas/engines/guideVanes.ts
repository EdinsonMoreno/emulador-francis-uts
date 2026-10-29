// Distribuidor Fink en vista cenital: corona de álabes directrices que pivotan
// con el ángulo α, rodete central girando y partículas de agua que entran en
// espiral siguiendo el ángulo del flujo (más giro cuando α es chico).
// El canvas NO calcula física: sólo lee α y Q (single source of truth = Zustand).

interface Particle {
  r: number; // radio (polar)
  theta: number; // ángulo (polar)
  life: number;
}

const particles: Particle[] = [];

export interface GuideVaneParams {
  alphaDeg: number; // ángulo de los álabes directrices
  Q: number; // caudal (controla densidad/velocidad de partículas)
}

const N_VANES = 16;

export function drawGuideVanes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  { alphaDeg, Q }: GuideVaneParams,
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.34; // radio de la corona de álabes
  const Rinlet = R * 1.32; // borde de la cámara espiral (entrada)
  const Rrunner = R * 0.46; // radio del rodete
  const alpha = (alphaDeg * Math.PI) / 180;
  const cotA = 1 / Math.max(Math.tan(alpha), 0.05);

  // --- Cámara espiral (anillo exterior insinuado) ---
  ctx.strokeStyle = 'rgba(148,163,184,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, Rinlet, 0, Math.PI * 2);
  ctx.stroke();

  // --- Partículas de agua: entran desde el exterior y espiralan hacia el rodete ---
  const target = Math.min(40 + Q * 8, 260);
  while (particles.length < target) {
    particles.push({ r: Rinlet, theta: Math.random() * Math.PI * 2, life: 1 });
  }
  const vr = 0.6 + Q * 0.12; // velocidad radial ∝ Q
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.r -= vr;
    // Componente tangencial: vθ/vr = cot(α) → más giro cuando α es chico.
    p.theta += (vr * cotA) / Math.max(p.r, 1);
    if (p.r <= Rrunner) {
      if (particles.length > target * 0.6) {
        particles.splice(i, 1);
        continue;
      }
      p.r = Rinlet;
      p.theta = Math.random() * Math.PI * 2;
    }
    const x = cx + p.r * Math.cos(p.theta);
    const y = cy + p.r * Math.sin(p.theta);
    const t = (p.r - Rrunner) / (Rinlet - Rrunner);
    ctx.fillStyle = `rgba(56,189,248,${0.25 + (1 - t) * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Álabes directrices (pivotan con α) ---
  const vaneLen = R * 0.42;
  for (let i = 0; i < N_VANES; i++) {
    const theta = (i / N_VANES) * Math.PI * 2;
    const bx = cx + R * Math.cos(theta);
    const by = cy + R * Math.sin(theta);
    // Dirección del flujo en ese punto (radial hacia adentro + giro), el álabe se
    // alinea con ella → al cerrar (α chico) quedan casi tangenciales.
    const fx = -Math.cos(theta) + cotA * -Math.sin(theta);
    const fy = -Math.sin(theta) + cotA * Math.cos(theta);
    const fa = Math.atan2(fy, fx);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(fa);
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, vaneLen / 2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- Rodete central (gira lento) ---
  const spin = time * 0.012;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, Rrunner, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const blades = 13;
  ctx.strokeStyle = 'rgba(34,211,238,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Rrunner * 0.3 * Math.cos(a), Rrunner * 0.3 * Math.sin(a));
    // álabe curvo
    ctx.quadraticCurveTo(
      Rrunner * 0.7 * Math.cos(a - 0.4),
      Rrunner * 0.7 * Math.sin(a - 0.4),
      Rrunner * Math.cos(a - 0.7),
      Rrunner * Math.sin(a - 0.7),
    );
    ctx.stroke();
  }
  ctx.restore();

  // Eje
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(cx, cy, Rrunner * 0.18, 0, Math.PI * 2);
  ctx.fill();
}
