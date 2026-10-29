import { useSceneStore } from '../store/sceneStore';
import { Slider } from '../components/ui/Slider';
import { Gauge } from '../components/ui/Gauge';
import { StatusLight } from '../components/ui/StatusLight';

export function ControlPanelView() {
  const physics = useSceneStore((s) => s.physics);
  const derived = useSceneStore((s) => s.derived);
  const setQ = useSceneStore((s) => s.setQ);
  const setAlpha = useSceneStore((s) => s.setAlpha);

  return (
    <div className="view">
      <div className="grid-2c">
        {/* Panel de control */}
        <div className="w-2/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Acciones</span>
            </div>
            <div className="card-body space-y-2">
              <button className="btn btn-primary w-full">▶ Arranque</button>
              <button className="btn btn-sm btn-amber w-full">Sincronizar</button>
              <button className="btn btn-sm btn-danger w-full">■ Paro de emergencia</button>
              <button className="btn btn-sm btn-secondary w-full">Pausar</button>
              <button className="btn btn-sm btn-secondary w-full">Continuar</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Distribuidor</span>
            </div>
            <div className="card-body">
              <Slider
                label="Ángulo de los álabes α"
                value={physics.alpha * 180 / Math.PI}
                min={10}
                max={80}
                unit="°"
                onChange={(v) => setAlpha((v * Math.PI) / 180)}
              />
              <Slider
                label="Caudal Q"
                value={physics.Q}
                min={2}
                max={30}
                unit="m³/s"
                onChange={setQ}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Control de velocidad (gobernador)</span>
            </div>
            <div className="card-body space-y-3">
              <Slider
                label="Consigna de velocidad"
                value={(derived.omega * 60) / (2 * Math.PI) * 1000}
                min={800}
                max={1600}
                unit="rpm"
                onChange={() => {
                  // La consigna se aplica en el motor
                }}
              />
              <Slider
                label="Ganancia PID (proportiona)"
                value={50}
                min={0}
                max={200}
                unit="%/s"
                onChange={() => {}}
              />
              <Slider
                label="Ganancia PID (derivada)"
                value={10}
                min={0}
                max={100}
                unit="%/s"
                onChange={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Panel derecho: indicadores */}
        <div className="w-3/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Estado del sistema</span>
            </div>
            <div className="card-body space-y-3">
              <Gauge value={derived.Vm} label="Caudal" unit="m³/s" size="md" status="ok" />
              <Gauge value={derived.Vu} label="Velocidad de giro" unit="rad/s" size="md" status="ok" />
              <Gauge value={derived.HE} label="Altura de Euler" unit="m" size="md" status="ok" />
              <Gauge value={derived.P} label="Potencia al eje" unit="W" size="lg" status="ok" />
              <Gauge value={derived.eta * 100} label="Eficiencia" unit="%" size="lg" status="ok" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Estado de seguridad</span>
            </div>
            <div className="card-body space-y-2">
              <StatusLight status="ok" label="Sin sobrecarga" />
              <StatusLight status="ok" label="Caudal dentro del rango" />
              <StatusLight status="ok" label="Velocidad en régimen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
