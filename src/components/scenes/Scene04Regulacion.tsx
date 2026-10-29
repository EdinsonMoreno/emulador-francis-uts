import { useRef, useEffect, useState } from 'react';
import { useSceneStore } from '../../store/sceneStore';
import { drawGuideVanes } from '../../canvas/engines/guideVanes';
import { Hint } from '../ui/Hint';

export function Scene04Regulacion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setAlpha = useSceneStore((s) => s.setAlpha);
  const setQ = useSceneStore((s) => s.setQ);
  const derived = useSceneStore((s) => s.derived);
  const [alphaDeg, setAlphaDeg] = useState(30);
  const [Q, setLocalQ] = useState(10);

  const handleAlpha = (deg: number) => {
    setAlphaDeg(deg);
    setAlpha((deg * Math.PI) / 180);
  };
  const handleQ = (q: number) => {
    setLocalQ(q);
    setQ(q);
  };

  // Bucle de animación (requestAnimationFrame). El canvas sólo lee α y Q del
  // store (single source of truth); no calcula física.
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
      const { physics } = useSceneStore.getState();
      drawGuideVanes(ctx, canvas.width, canvas.height, time, {
        alphaDeg: (physics.alpha * 180) / Math.PI,
        Q: physics.Q,
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
        <h2 className="text-2xl font-bold text-white">Regulación de Caudal</h2>
        <p className="text-sm text-slate-200/90 mt-1">
          Los <span className="text-amber-300">álabes directrices</span> pivotan para
          fijar el ángulo α del flujo. Al cerrarlos, el agua entra más tangencial y
          se reduce el caudal de paso hacia el rodete.
        </p>
      </div>

      <div
        data-anim
        className="absolute top-6 right-6 bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-mono space-y-1.5 min-w-[180px] border border-white/20 shadow-lg shadow-black/30 pointer-events-none"
      >
        <div className="text-[10px] uppercase tracking-widest text-cyan-300/90 pb-1 border-b border-white/10">
          Resultado
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-200/90">Potencia</span>
          <span className="text-white font-bold">{(derived.P / 1e6).toFixed(2)} <span className="text-slate-300/85">MW</span></span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-200/90">Rendimiento</span>
          <span className="text-white font-bold">{(derived.eta * 100).toFixed(1)} <span className="text-slate-300/85">%</span></span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-200/90">H Euler</span>
          <span className="text-white font-bold">{derived.HE.toFixed(1)} <span className="text-slate-300/85">m</span></span>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-6">
        <div
          data-anim
          className="relative group w-64 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Cerrá los álabes y mostrá cómo cae la potencia: así se adapta la turbina a la demanda."
          />
          <label className="text-xs text-slate-100/95 font-mono block text-center">
            Ángulo álabes α: {alphaDeg}°
          </label>
          <input
            type="range"
            min={10}
            max={80}
            value={alphaDeg}
            onChange={(e) => handleAlpha(parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-white/65 font-mono">
            <span>Cerrado</span>
            <span>Abierto</span>
          </div>
        </div>
        <div
          data-anim
          className="relative group w-64 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Variá el caudal y seguí el panel de Resultado (Potencia, Rendimiento) arriba a la derecha."
          />
          <label className="text-xs text-slate-100/95 font-mono block text-center">
            Caudal Q: {Q.toFixed(1)} m³/s
          </label>
          <input
            type="range"
            min={2}
            max={30}
            step={0.5}
            value={Q}
            onChange={(e) => handleQ(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
