interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const particles: Particle[] = [];

export function drawParticleFlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _time: number,
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 120, 80, angle, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (particles.length < 80) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx + Math.cos(angle) * 100,
      y: cy + Math.sin(angle) * 60,
      vx: -Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed * 0.6,
      life: 1,
      size: 1.5 + Math.random() * 2.5,
    });
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.008;

    const dx = p.x - cx;
    const dy = (p.y - cy) * 1.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
      p.vx += (cx - p.x) * 0.002;
      p.vy += (cy - p.y) * 0.001;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.life <= 0 || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
      particles.splice(i, 1);
    }
  }

  ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ecuación de Bernoulli', cx, 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '22px serif italic';
  ctx.fillText('P₁ + ½ρV₁² + ρgz₁ = P₂ + ½ρV₂² + ρgz₂', cx, 70);
}
