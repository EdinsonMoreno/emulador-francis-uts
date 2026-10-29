// Corte lateral de la instalación: rodete a una altura de aspiración Hs sobre el
// nivel de descarga, tubo de aspiración y burbujas de cavitación que aparecen en
// la cara de succión cuando el número de Thoma σ cae por debajo del crítico.
// El canvas sólo lee Hs y σ (la física vive en la escena/store).

interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  life: number;
}

const bubbles: Bubble[] = [];

export interface CavitationParams {
  Hs: number; // altura de aspiración [m]
  sigma: number; // coef. de Thoma
  sigmaCrit: number; // coef. de Thoma crítico
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(fromX, fromY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '16px ui-sans-serif, sans-serif';
  const right = toX < fromX;
  ctx.textAlign = right ? 'end' : 'start';
  ctx.fillText(text, toX + (right ? -6 : 6), toY + 4);
  ctx.textAlign = 'start';
}

export function drawCavitation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  { Hs, sigma, sigmaCrit }: CavitationParams,
) {
  ctx.clearRect(0, 0, width, height);

  const waterY = height * 0.78; // nivel de agua aguas abajo
  const pxPerM = (height * 0.46) / 11; // escala vertical (rango Hs: -2..9 m)
  const cx = width * 0.46;
  const runnerY = waterY - Hs * pxPerM; // cota del rodete
  const runnerR = Math.min(width, height) * 0.08;

  const severity = Math.max(0, (sigmaCrit - sigma) / sigmaCrit); // 0 = seguro
  const cavitating = sigma < sigmaCrit;

  // --- Agua aguas abajo ---
  ctx.fillStyle = 'rgba(30,64,118,0.4)';
  ctx.fillRect(0, waterY, width, height - waterY);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y = waterY + Math.sin(x * 0.03 + time * 0.05) * 2.5;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- Cámara espiral (voluta tipo caracol, reconocible) ---
  const volY = runnerY - runnerR * 1.9;
  ctx.strokeStyle = 'rgba(148,163,184,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 * 1.6; a += 0.12) {
    const rr = runnerR * (0.7 + a * 0.16);
    const x = cx + rr * Math.cos(a - Math.PI / 2);
    const y = volY + rr * Math.sin(a - Math.PI / 2);
    a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- Tubo de aspiración (cono que baja al agua) ---
  const tubeTopY = runnerY + runnerR * 0.6;
  ctx.fillStyle = 'rgba(100,116,139,0.18)';
  ctx.strokeStyle = 'rgba(148,163,184,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - runnerR * 0.8, tubeTopY);
  ctx.lineTo(cx - runnerR * 1.7, waterY + 6);
  ctx.lineTo(cx + runnerR * 1.7, waterY + 6);
  ctx.lineTo(cx + runnerR * 0.8, tubeTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- Zona de baja presión (entrada del tubo): azul→rojo según σ ---
  ctx.fillStyle = cavitating
    ? `rgba(239,68,68,${0.25 + Math.min(severity, 1) * 0.45})`
    : 'rgba(56,189,248,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, tubeTopY + runnerR * 0.4, runnerR * 1.1, runnerR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Rodete ---
  ctx.save();
  ctx.translate(cx, runnerY);
  ctx.fillStyle = 'rgba(15,23,42,0.95)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, runnerR, runnerR * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(148,163,184,0.6)';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * runnerR * 0.35, -runnerR * 0.55);
    ctx.lineTo(i * runnerR * 0.35 - runnerR * 0.25, runnerR * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // --- Burbujas de cavitación (sólo si σ < σ_crit) ---
  if (cavitating) {
    const spawn = Math.min(Math.round(severity * 6), 8);
    for (let s = 0; s < spawn; s++) {
      bubbles.push({
        x: cx + (Math.random() - 0.5) * runnerR * 1.6,
        y: tubeTopY + runnerR * 0.3 + Math.random() * runnerR * 0.5,
        vy: -(0.4 + Math.random() * 1.2),
        r: 1 + Math.random() * 3,
        life: 1,
      });
    }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y += b.vy;
    b.x += Math.sin(time * 0.1 + i) * 0.4;
    b.life -= 0.02;
    if (b.life <= 0) {
      bubbles.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = `rgba(248,250,252,${b.life * 0.8})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Cota Hs (flecha de dimensión) ---
  ctx.strokeStyle = '#fbbf24';
  ctx.fillStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  const dimX = cx + runnerR * 2.3;
  ctx.beginPath();
  ctx.moveTo(dimX, runnerY);
  ctx.lineTo(dimX, waterY);
  ctx.stroke();
  for (const yy of [runnerY, waterY]) {
    ctx.beginPath();
    ctx.moveTo(dimX - 4, yy + (yy === runnerY ? 6 : -6));
    ctx.lineTo(dimX, yy);
    ctx.lineTo(dimX + 4, yy + (yy === runnerY ? 6 : -6));
    ctx.stroke();
  }
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`Hs = ${Hs.toFixed(1)} m`, dimX + 8, (runnerY + waterY) / 2);
  ctx.strokeStyle = 'rgba(251,191,36,0.3)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, runnerY);
  ctx.lineTo(dimX, runnerY);
  ctx.moveTo(0, waterY);
  ctx.lineTo(dimX, waterY);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Etiquetas de los componentes (con líneas guía) ---
  label(ctx, 'Cámara espiral', cx + runnerR * 1.4, volY - runnerR * 0.6, cx - runnerR * 4.2, volY - runnerR, '#cbd5e1');
  label(ctx, 'Rodete', cx - runnerR * 0.8, runnerY, cx - runnerR * 4.2, runnerY, '#cbd5e1');
  label(
    ctx,
    cavitating ? 'Baja presión → CAVITA' : 'Salida (baja presión)',
    cx - runnerR, tubeTopY + runnerR * 0.4,
    cx - runnerR * 4.2, tubeTopY + runnerR * 0.6,
    cavitating ? '#f87171' : '#38bdf8',
  );
  label(ctx, 'Tubo de aspiración', cx - runnerR * 1.3, (tubeTopY + waterY) / 2, cx - runnerR * 4.2, waterY - 6, '#cbd5e1');
  ctx.fillStyle = '#38bdf8';
  ctx.font = '15px ui-sans-serif, sans-serif';
  ctx.fillText('Nivel de descarga (aguas abajo)', 12, waterY + 22);

  // --- Barra de presión / margen anti-cavitación (σ vs σ_crít) ---
  const gx = width - 64;
  const gTop = height * 0.18;
  const gH = height * 0.5;
  const sMax = sigmaCrit * 3; // tope visual de la escala
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(gx, gTop, 20, gH);
  // relleno proporcional a σ
  const fill = Math.max(0, Math.min(sigma / sMax, 1)) * gH;
  ctx.fillStyle = cavitating ? '#ef4444' : '#22d3ee';
  ctx.fillRect(gx, gTop + gH - fill, 20, fill);
  // umbral σ_crit
  const critY = gTop + gH - (sigmaCrit / sMax) * gH;
  ctx.strokeStyle = '#f87171';
  ctx.setLineDash([5, 3]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx - 6, critY);
  ctx.lineTo(gx + 26, critY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f87171';
  ctx.font = '14px monospace';
  ctx.textAlign = 'end';
  ctx.fillText('σ_crít', gx - 8, critY + 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('σ', gx + 10, gTop - 8);
  ctx.textAlign = 'start';
}
