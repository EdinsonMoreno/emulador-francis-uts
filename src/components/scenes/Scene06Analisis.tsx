import { useRef, useEffect, useState } from 'react';
import { drawCavitation } from '../../canvas/engines/cavitation';
import { Hint } from '../ui/Hint';

// Datos de referencia (agua a ~20 °C, a nivel del mar).
const H = 50; // altura neta de la instalación [m]
const H_ATM = 101325 / (1000 * 9.81); // ≈ 10.33 m (presión atmosférica)
const H_VAP = 2339 / (1000 * 9.81); // ≈ 0.24 m (presión de vapor)
const SIGMA_CRIT = 0.1; // coef. de Thoma crítico (didáctico) para esta turbina

function clasificar(sigma: number) {
  if (sigma < SIGMA_CRIT) return { label: 'Cavitación severa', color: 'text-red-400', ring: 'ring-red-500/60' };
  if (sigma < SIGMA_CRIT * 1.5) return { label: 'Cavitación moderada', color: 'text-orange-300', ring: 'ring-orange-500/50' };
  return { label: 'Sin cavitación', color: 'text-sky-300', ring: 'ring-sky-500/40' };
}

export function Scene06Analisis() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [Hs, setHs] = useState(3);
  const HsRef = useRef(Hs);
  HsRef.current = Hs;

  const sigma = (H_ATM - H_VAP - Hs) / H;
  const zona = clasificar(sigma);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let time = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      if (!ctx || !canvas) return;
      time += 1;
      const hs = HsRef.current;
      const sig = (H_ATM - H_VAP - hs) / H;
      drawCavitation(ctx, canvas.width, canvas.height, time, {
        Hs: hs,
        sigma: sig,
        sigmaCrit: SIGMA_CRIT,
      });
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <div
        data-anim
        className="absolute top-6 left-6 max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 shadow-lg shadow-black/30"
      >
        <h2 className="text-2xl font-bold text-white">Análisis de Cavitación</h2>
        <p className="text-sm text-slate-200/90 mt-1">
          Si el rodete se monta muy alto sobre el nivel de descarga, la presión a la
          salida cae por debajo de la de vapor y el agua hierve en frío: aparecen
          burbujas que colapsan y dañan los álabes. Criterio de Thoma:{' '}
          <span className="text-cyan-300/90 font-mono">σ &lt; σ_crít → cavita</span>.
        </p>
      </div>

      <div
        data-anim
        className={`absolute top-6 right-6 bg-white/10 backdrop-blur-md rounded-xl p-4 text-xs font-mono space-y-2 min-w-[210px] border border-white/20 shadow-lg shadow-black/30 ring-2 ${zona.ring} pointer-events-none`}
      >
        <div className="flex justify-between gap-4">
          <span className="text-slate-200/90">σ (Thoma)</span>
          <span className="text-white font-bold">{sigma.toFixed(3)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-200/90">σ crítico</span>
          <span className="text-white/80">{SIGMA_CRIT.toFixed(2)}</span>
        </div>
        <div className={`text-center font-bold pt-1 ${zona.color}`}>{zona.label}</div>
      </div>

      <div
        data-anim
        className="group absolute bottom-12 left-1/2 -translate-x-1/2 w-80 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
      >
        <Hint
          side="top"
          text="Subí Hₛ (rodete más alto): mostrá cómo baja σ, se pone rojo y aparecen las burbujas de cavitación."
        />
        <label className="text-xs text-slate-100/95 font-mono block text-center">
          Altura de aspiración Hₛ: {Hs.toFixed(1)} m
        </label>
        <input
          type="range"
          min={-2}
          max={9}
          step={0.5}
          value={Hs}
          onChange={(e) => setHs(parseFloat(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-[10px] text-white/65 font-mono">
          <span>Sumergido (−2 m)</span>
          <span>Elevado (9 m)</span>
        </div>
      </div>
    </div>
  );
}
