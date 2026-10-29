import { useSceneStore } from '../store/sceneStore';
import { Slider } from '../components/ui/Slider';
import { Gauge } from '../components/ui/Gauge';
import { StatusLight } from '../components/ui/StatusLight';
import { LiveValue } from '../components/ui/LiveValue';

export function Schematic2DView() {
  const physics = useSceneStore((s) => s.physics);
  const derived = useSceneStore((s) => s.derived);

  return (
    <div className="view">
      <div className="grid-2c">
        {/* Esquema 2D canvas */}
        <div className="relative flex-1" style={{ height: '100%' }}>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <span className="card-title">Esquema 2D · Ruta del agua</span>
            </div>
            <div className="card-body" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <canvas
                ref={null as any}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
              <div className="absolute top-3 left-3 text-xs text-text-secondary bg-bg-elev px-2 py-1 rounded">
                Esquema hidráulico + unifilar eléctrico
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="w-2/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Parámetros en vivo</span>
            </div>
            <div className="card-body space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Gauge value={derived.Vm} label="Vm (meridional)" unit="m/s" size="sm" status="ok" />
                <Gauge value={derived.Vu} label="Vu (giro)" unit="m/s" size="sm" status="ok" />
              </div>
              <Gauge value={derived.V} label="V (absoluta)" unit="m/s" size="md" status="ok" />
              <Gauge value={derived.W} label="W (relativa)" unit="m/s" size="md" status="ok" />
              <div className="grid grid-cols-2 gap-3">
                <Gauge value={derived.HE} label="H Eular" unit="m" size="md" status="ok" />
                <Gauge value={derived.P} label="Potencia" unit="W" size="md" status="ok" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Recorrido del agua</span>
            </div>
            <div className="card-body space-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2"><span className="text-success">◆</span> Embalse / Reservorio</div>
              <div className="flex items-center gap-2"><span className="text-text-secondary">▶</span> Tubería forzada</div>
              <div className="flex items-center gap-2"><span className="text-accent-blue">◈</span> Distribuidor</div>
              <div className="flex items-center gap-2"><span className="text-accent-blue">◈</span> Rodete</div>
              <div className="flex items-center gap-2"><span className="text-success">△</span> Tubo de aspiración</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
