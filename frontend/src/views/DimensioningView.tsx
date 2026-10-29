import { Slider } from '../components/ui/Slider';
import { Gauge } from '../components/ui/Gauge';
import { StatusLight } from '../components/ui/StatusLight';

export function DimensioningView() {
  const params = {
    H: 50,
    Q: 12,
    n: 30,
    D: 0.5,
    r1: 0.12,
    eta: 0.92,
    P: 5.4e6,
    rho: 1000,
    g: 9.81,
  };

  const A1 = Math.PI * params.r1**2;
  const U = params.n * params.r1;
  const phi = (params.g * params.H) / (params.n**2 * params.r1**2);
  const psi = params.Q / (params.n * params.r1**3);
  const rho_value = params.P / (params.rho * params.g * params.n**3 * params.r1**5);

  return (
    <div className="view">
      <div className="grid-2c">
        {/* Panel de dimensionamiento */}
        <div className="w-2/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Diseño del prototipo</span>
            </div>
            <div className="card-body space-y-4">
              <Slider
                label="Altura neta H"
                value={params.H}
                min={0.1}
                max={500}
                unit="m"
                onChange={(v) => {}}
              />
              <Slider
                label="Caudal Q"
                value={params.Q}
                min={0.001}
                max={100}
                unit="m³/s"
                onChange={() => {}}
              />
              <Slider
                label="Velocidad ω"
                value={params.n}
                min={0.1}
                max={400}
                unit="rad/s"
                onChange={() => {}}
              />
              <Slider
                label="Diámetro del rodete D"
                value={params.D}
                min={0.01}
                max={5}
                unit="m"
                onChange={() => {}}
              />
              <Slider
                label="Diámetro del paso B₁"
                value={0.2}
                min={0.01}
                max={1}
                unit="m"
                onChange={() => {}}
              />
              <Slider
                label="Radiante de entrada r₁"
                value={0.5}
                min={0.01}
                max={1}
                unit="m"
                onChange={() => {}}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Punto de diseño</span>
            </div>
            <div className="card-body space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">n₁₁ (velocidad específica)</span>
                <span className="font-mono text-text-primary">{params.n} rad/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Q₁₁ (caudal específico)</span>
                <span className="font-mono text-text-primary">{params.Q.toFixed(4)} m³/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">η (eficiencia)</span>
                <span className="font-mono text-primary">{params.eta * 100}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de resultados */}
        <div className="w-3/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Resultados del dimensionamiento</span>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Potencia al eje P</span>
                <span className="font-mono text-primary">{params.P.toFixed(0)} W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Velocidad síncrona nₛ</span>
                <span className="font-mono text-primary">{params.n} rad/s &nbsp;({(params.n * 60)/(2*Math.PI).toFixed(0)} rpm)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Coef. φ (cabeceo)</span>
                <span className="font-mono text-primary">{phi.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Coef. ψ (caudal)</span>
                <span className="font-mono text-primary">{psi.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Coef. ρ (potencia)</span>
                <span className="font-mono text-primary">{rho_value.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">η (eficiencia)</span>
                <span className="font-mono text-primary">{params.eta * 100}%</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Recomendación de diseño</span>
            </div>
            <div className="card-body text-sm text-text-secondary">
              <p>
                El punto de diseño se seleccionó en el máximo de la curva de
                colina (η = {params.eta * 100} %). El número específico de
               velocidad <span className="font-mono text-text-primary">n₁₁</span>
                {(params.n * 60) / (2 * Math.PI).toFixed(0)} rpm está dentro del
                rango de operación de una turbina Francis de tamaño de
                laboratorio.
              </p>
              <p className="mt-2">
                El caudal de <span className="font-mono text-text-primary">{params.Q} m³/s</span>
                y la altura neta de{' '}
                <span className="font-mono text-text-primary">{params.H} m</span>
                indican un tamaño adecuado para un prototipo de laboratorio
                con caudal moderado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
