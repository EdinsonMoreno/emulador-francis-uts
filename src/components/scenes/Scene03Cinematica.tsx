import { useCallback, useState } from 'react';
import { useSceneStore } from '../../store/sceneStore';
import { drawVelocityTriangle } from '../../canvas/engines/velocityTriangle';
import { Canvas2D } from '../2d/Canvas2D';
import { HUD } from '../2d/HUD';
import { Hint } from '../ui/Hint';

export function Scene03Cinematica() {
  const derived = useSceneStore((s) => s.derived);
  const setQ = useSceneStore((s) => s.setQ);
  const setAlpha = useSceneStore((s) => s.setAlpha);
  const [sliderQ, setSliderQ] = useState(10);
  const [sliderAlpha, setSliderAlpha] = useState(30);

  const handleQChange = (v: number) => {
    setSliderQ(v);
    setQ(v);
  };

  const handleAlphaChange = (v: number) => {
    setSliderAlpha(v);
    setAlpha((v * Math.PI) / 180);
  };

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      drawVelocityTriangle(ctx, derived, w, h);
    },
    [derived],
  );

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <Canvas2D draw={draw} />
      </div>

      <HUD />

      <div
        data-anim
        className="absolute top-6 left-6 max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 shadow-lg shadow-black/30"
      >
        <h2 className="text-2xl font-bold text-white">Cinemática del Flujo</h2>
        <p className="text-sm text-slate-200/90 mt-1">
          Triángulo de velocidades a la entrada del rodete:{' '}
          <span className="text-cyan-300/90 font-semibold">V = U + W</span>. Ajustá
          el caudal y el ángulo del distribuidor en vivo.
        </p>
      </div>

      <div className="absolute bottom-8 left-8 right-8 flex gap-6 z-10 max-w-2xl">
        <div
          data-anim
          className="relative group flex-1 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Subí el caudal y mostrá cómo crece Vm, la componente que atraviesa la turbina."
          />
          <label className="text-xs text-slate-100/95 font-mono">
            Caudal Q: {sliderQ.toFixed(1)} m³/s
          </label>
          <input
            type="range"
            min={2}
            max={30}
            step={0.5}
            value={sliderQ}
            onChange={(e) => handleQChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div
          data-anim
          className="relative group flex-1 space-y-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg shadow-black/30"
        >
          <Hint
            side="top"
            text="Cambiá α y mostrá cómo se inclina V: ese ángulo lo fijan los álabes (lo vemos en Regulación)."
          />
          <label className="text-xs text-slate-100/95 font-mono">
            Ángulo α: {sliderAlpha}°
          </label>
          <input
            type="range"
            min={10}
            max={80}
            step={1}
            value={sliderAlpha}
            onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
