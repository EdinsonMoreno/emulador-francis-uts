import { useSceneStore } from '../../store/sceneStore';

export function HUD() {
  const derived = useSceneStore((s) => s.derived);
  const physics = useSceneStore((s) => s.physics);

  const betaDeg = (Math.atan2(derived.Vm, derived.U - derived.Vu) * 180) / Math.PI;

  const items = [
    { label: 'Q (caudal)', value: physics.Q.toFixed(2), unit: 'm³/s' },
    { label: 'α (flujo)', value: ((physics.alpha * 180) / Math.PI).toFixed(1), unit: '°' },
    { label: 'β (álabe)', value: betaDeg.toFixed(1), unit: '°' },
    { label: 'H Euler', value: derived.HE.toFixed(1), unit: 'm' },
    { label: 'P (potencia)', value: (derived.P / 1e6).toFixed(2), unit: 'MW' },
    { label: 'η (eficiencia)', value: (derived.eta * 100).toFixed(1), unit: '%' },
  ];

  return (
    <div
      data-anim
      className="absolute top-6 right-6 bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-mono space-y-1.5 min-w-[200px] border border-white/20 shadow-lg shadow-black/30"
    >
      <div className="text-[10px] uppercase tracking-widest text-cyan-300/90 pb-1 border-b border-white/10">
        Parámetros en vivo
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-4">
          <span className="text-slate-200/90">{item.label}</span>
          <span className="text-white font-bold">
            {item.value} <span className="text-slate-300/85">{item.unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
