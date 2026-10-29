import { useSceneStore } from '../store/sceneStore';
import { Slider } from '../components/ui/Slider';
import { Gauge } from '../components/ui/Gauge';
import { StatusLight } from '../components/ui/StatusLight';

export function TelemetryView() {
  const physics = useSceneStore((s) => s.physics);
  const derived = useSceneStore((s) => s.derived);
  const setQ = useSceneStore((s) => s.setQ);
  const setAlpha = useSceneStore((s) => s.setAlpha);

  const alphaDeg = (physics.alpha * 180) / Math.PI;

  return (
    <div className="view">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Gauge value={derived.Vm} label="Vm (meridional)" unit="m/s" size="sm" status="ok" />
          <Gauge value={derived.Vu} label="Vu (giro)" unit="m/s" size="sm" status="ok" />
          <Gauge value={derived.HE} label="H Euler" unit="m" size="md" status="ok" />
          <Gauge value={derived.P} label="Potencia" unit="W" size="md" status="ok" />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Indicadores en vivo</span>
          </div>
          <div className="card-body space-y-3">
            <Gauge value={derived.P} label="Potencia al eje" unit="W" size="lg" status="ok" />
            <Gauge value={derived.eta} label="Rendimiento total" unit="%" size="lg" status="ok" />
            <Gauge value={derived.omega} label="Rotor" unit="rad/s" size="md" status="ok" />
            <Gauge value={derived.V} label="V absoluta" unit="m/s" size="md" status="ok" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Parámetros de operación</span>
          </div>
          <div className="card-body space-y-3">
            <Slider
              label="Caudal Q"
              value={physics.Q}
              min={2}
              max={30}
              unit="m³/s"
              onChange={setQ}
            />
            <Slider
              label="Ángulo α"
              value={alphaDeg}
              min={10}
              max={80}
              unit="°"
              onChange={(v) => setAlpha((v * Math.PI) / 180)}
            />
            <Slider
              label="Consigna n*"
              value={derived.omega * 60 / (2 * Math.PI) * 1000}
              min={800}
              max={1600}
              unit="rpm"
              onChange={() => {}}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Triángulo de velocidades</span>
          </div>
          <div className="card-body space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">V (absoluta)</span>
              <span className="font-mono text-primary">{derived.V.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">U (periférica)</span>
              <span className="font-mono text-primary">{derived.U.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Vm (meridional)</span>
              <span className="font-mono text-primary">{derived.Vm.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Vu (tangencial)</span>
              <span className="font-mono text-primary">{derived.Vu.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">W (relativa)</span>
              <span className="font-mono text-primary">{derived.W.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">α (ángulo)</span>
              <span className="font-mono text-primary">{alphaDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">β (álabe)</span>
              <span className="font-mono text-primary">
                {Math.atan2(derived.Vm, derived.U - derived.Vu) * 180 / Math.PI}
                °
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
