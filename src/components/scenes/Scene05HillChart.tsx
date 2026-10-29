import { useCallback, useState } from 'react';
import { drawHillChart, hillEfficiency } from '../../canvas/engines/hillChart';
import { Canvas2D } from '../2d/Canvas2D';
import { Hint } from '../ui/Hint';

export function Scene05HillChart() {
  const [Q, setQ] = useState(11); // m³/s  (2–20)
  const [H, setH] = useState(50); // m     (20–70)

  const qN = (Q - 2) / 18;
  const hN = (H - 20) / 50;
  const eta = hillEfficiency(qN, hN);

  const estado =
    eta > 0.88
      ? { txt: 'Operación óptima', cls: 'text-emerald-300', ring: 'ring-emerald-500/50' }
      : eta > 0.75
        ? { txt: 'Rendimiento bueno', cls: 'text-cyan-300', ring: 'ring-cyan-500/40' }
        : { txt: 'Lejos del óptimo', cls: 'text-amber-300', ring: 'ring-amber-500/50' };

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, hgt: number) => {
      drawHillChart(ctx, w, hgt, qN, hN);
    },
    [qN, hN],
  );

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <Canvas2D draw={draw} />
      </div>

      <div
        data-anim
        className="absolute top-6 left-1/2 -translate-x-1/2 text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 shadow-lg shadow-black/30"
      >
        <h2 className="text-2xl font-bold text-white">Diagrama de Colina (Hill Chart)</h2>
        <p className="text-sm text-slate-200/90 mt-1">
          El “mapa de rendimiento” de la turbina. Movés el punto de operación y mirás
          cuánto rinde.
        </p>
      </div>

      {/* Cómo leer el diagrama */}
      <div
        data-anim
        className="absolute top-28 left-6 w-80 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 shadow-lg shadow-black/30"
      >
        <div className="text-xs uppercase tracking-widest text-cyan-300/90 mb-3">
          Cómo leerlo
        </div>
        <ul className="text-sm text-slate-100/95 space-y-2.5 leading-snug">
          <li className="flex gap-2">
            <span className="text-emerald-300 shrink-0">▸</span>
            <span>Cada elipse une puntos de igual rendimiento (iso-eficiencia).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-300 shrink-0">▸</span>
            <span>La cima es el <span className="text-emerald-300 font-semibold">BEP</span>: el punto de máximo rendimiento.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-300 shrink-0">▸</span>
            <span>Alejarse del centro = menos eficiencia.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-300 shrink-0">▸</span>
            <span>La <span className="text-red-300 font-semibold">zona roja</span> es riesgo de cavitación: hay que evitarla.</span>
          </li>
        </ul>
      </div>

      {/* Lectura en vivo */}
      <div
        data-anim
        className={`absolute top-28 right-6 min-w-[190px] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30 ring-2 ${estado.ring}`}
      >
        <div className="text-[10px] uppercase tracking-widest text-cyan-300/90 mb-2">
          Punto de operación
        </div>
        <div className="text-3xl font-bold text-white text-center">
          {(eta * 100).toFixed(1)}<span className="text-lg text-slate-300/85">%</span>
        </div>
        <div className={`text-center text-xs font-semibold mt-1 ${estado.cls}`}>
          {estado.txt}
        </div>
        <div className="mt-3 pt-2 border-t border-white/10 text-[11px] font-mono text-slate-200/90 space-y-0.5">
          <div className="flex justify-between"><span>Caudal Q</span><span>{Q.toFixed(1)} m³/s</span></div>
          <div className="flex justify-between"><span>Salto H</span><span>{H.toFixed(0)} m</span></div>
        </div>
      </div>

      {/* Sliders */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
        <div
          data-anim
          className="relative group w-60 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Mové el punto hacia la cima (BEP) y mostrá cómo sube el rendimiento; alejándote, baja."
          />
          <label className="text-xs text-slate-100/95 font-mono block text-center">
            Caudal Q: {Q.toFixed(1)} m³/s
          </label>
          <input
            type="range"
            min={2}
            max={20}
            step={0.5}
            value={Q}
            onChange={(e) => setQ(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div
          data-anim
          className="relative group w-60 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Llevá el punto a la zona roja para mostrar el riesgo de cavitación (se enlaza con la última escena)."
          />
          <label className="text-xs text-slate-100/95 font-mono block text-center">
            Salto H: {H.toFixed(0)} m
          </label>
          <input
            type="range"
            min={20}
            max={70}
            step={1}
            value={H}
            onChange={(e) => setH(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
