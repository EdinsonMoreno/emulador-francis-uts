import { useState } from 'react';
import { SceneCanvas3D } from '../3d/SceneCanvas3D';
import { SketchfabEmbed } from '../3d/SketchfabEmbed';
import type { SpinAxis } from '../3d/TurbineModel';
import { Hint } from '../ui/Hint';

const AXES: { id: SpinAxis; label: string }[] = [
  { id: 'x', label: 'Eje X' },
  { id: 'y', label: 'Eje Y' },
  { id: 'z', label: 'Eje Z' },
];

const componentes = [
  { n: 'Cámara espiral', d: 'Distribuye el agua uniformemente alrededor del rodete.' },
  { n: 'Álabes directrices', d: 'Regulan el caudal y el ángulo de entrada α.' },
  { n: 'Rodete (runner)', d: 'Convierte la energía del agua en trabajo mecánico.' },
  { n: 'Tubo de aspiración', d: 'Recupera energía cinética y reduce la cavitación.' },
];

export function Scene02Anatomia() {
  const [axis, setAxis] = useState<SpinAxis>('x');
  const [speed, setSpeed] = useState(25); // 0–100 %

  return (
    <div className="w-full h-full flex">
      {/* Izquierda (1/2): modelo 3D local — el protagonista. */}
      <div className="relative w-1/2 h-full border-r border-white/10">
        <SceneCanvas3D spinSpeed={(speed / 100) * 2.5} spinAxis={axis} />

        <div
          data-anim
          className="group absolute top-6 left-6 max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 shadow-lg shadow-black/30"
        >
          <Hint
            side="bottom"
            text="Nombrá las partes siguiendo el camino del agua: caracol → distribuidor → rodete → tubo de aspiración."
          />
          <h2 className="text-2xl font-bold text-white">Anatomía de la Turbina Francis</h2>
          <p className="text-sm text-slate-200/90 mt-1">
            Turbina de reacción de flujo radial-axial. Arrastrá para mirar alrededor.
          </p>
        </div>

        {/* Control de rotación automática */}
        <div
          data-anim
          className="group absolute top-6 right-6 w-60 space-y-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 shadow-lg shadow-black/30"
        >
          <Hint
            side="bottom"
            text="Elegí el eje y la velocidad: el rodete gira sobre su eje como la turbina real. Arrastrá para mirar alrededor."
          />
          <div className="text-[10px] uppercase tracking-widest text-cyan-300/90">
            Rotación automática
          </div>
          <div className="flex gap-1.5">
            {AXES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAxis(a.id)}
                className={`flex-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  axis === a.id
                    ? 'bg-emerald-500/90 text-slate-900 shadow-md shadow-emerald-500/30'
                    : 'text-slate-200/90 hover:text-slate-100 hover:bg-white/10 border border-white/15'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-100/95 font-mono flex justify-between">
              <span>Velocidad</span>
              <span>{speed}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3">
          {componentes.map((c) => (
            <div
              key={c.n}
              data-anim
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 shadow-lg shadow-black/30"
            >
              <div className="text-base font-bold text-emerald-300 mb-1">{c.n}</div>
              <div className="text-sm text-slate-100/95 leading-relaxed">{c.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Derecha (1/2): dos modelos de referencia en Sketchfab, apilados (1/4 c/u). */}
      <div className="w-1/2 h-full flex flex-col">
        <div data-anim className="relative h-1/2 border-b border-white/10">
          <div className="absolute top-3 left-4 z-10 text-xs font-semibold text-cyan-300 bg-black/40 px-2 py-1 rounded pointer-events-none">
            Conjunto horizontal
          </div>
          <SketchfabEmbed
            modelId="36f993c31b434d098aedf12a2ddca2d0"
            title="Horizontal Francis turbine"
            author="KAHAKU"
            authorUrl="https://sketchfab.com/KAHAKU"
            modelUrl="https://sketchfab.com/3d-models/horizontal-francis-turbine-36f993c31b434d098aedf12a2ddca2d0"
          />
        </div>
        <div data-anim className="relative h-1/2">
          <div className="absolute top-3 left-4 z-10 text-xs font-semibold text-cyan-300 bg-black/40 px-2 py-1 rounded pointer-events-none">
            Detalle del rodete
          </div>
          <SketchfabEmbed
            modelId="e8770222d0c94789b457f59ae829ccd6"
            title="Francis Turbine Runners"
            author="3_design"
            authorUrl="https://sketchfab.com/3_design"
            modelUrl="https://sketchfab.com/3d-models/francis-turbine-runners-e8770222d0c94789b457f59ae829ccd6"
          />
        </div>
      </div>
    </div>
  );
}
