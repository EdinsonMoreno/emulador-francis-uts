import { useState } from 'react';
import { Button } from '../components/ui/Button';

export function PracticesView() {
  const [activeGuide, setActiveGuide] = useState(0);

  const guides = [
    {
      id: 0,
      title: 'Práctica 1 · Arranque y régimen estacionario',
      description: 'Controlar el arranque de la turbina y verificar el régimen de operación.',
      steps: [
        '1. Asegurar que el sistema está en paro de emergencia.',
        '2. Establecer la altura neta H₀ = 50 m.',
        '3. Ajustar el caudal Q = 10 m³/s.',
        '4. Iniciar el arranque (botón "Arranque").',
        '5. Observar la variación de velocidad y caudal hasta el régimen permanente.',
        '6. Registrar los valores de P, η, f y ω en el registro de sesión.',
      ],
    },
    {
      id: 1,
      title: 'Práctica 2 · Regulación de caudal',
      description: 'Ajustar el distribuidor y observar la respuesta de la turbina.',
      steps: [
        '1. Conectar la carga eléctrica al generador.',
        '2. Fijar la velocidad ω = 30 rad/s (consigna).',
        '3. Abrir el distribuidor lentamente (de 10° a 80°).',
        '4. Observar cómo cambian P, η y Q.',
        '5. Iniciar la obtención de la curva de potencia P–Q.',
      ],
    },
    {
      id: 2,
      title: 'Práctica 3 · Diagrama de colina',
      description: 'Obetener el diagrama de colina y el punto de mejor eficiencia.',
      steps: [
        '1. Con las condiciones del punto de diseño, registrar la eficiencia.',
        '2. Variar el caudal hasta el máximo de la curva de eficiencia.',
        '3. Registrar el punto de mejor eficiencia (BEP).',
        '4. Detectar la zona de cavitación en el diagrama.',
      ],
    },
  ];

  return (
    <div className="view">
      <div className="space-y-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Guías de laboratorio</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-3 gap-2">
              {guides.map((g) => (
                <button
                  key={g.id}
                  className={`btn btn-sm w-full ${activeGuide === g.id ? 'btn-primary' : ''}`}
                  onClick={() => setActiveGuide(g.id)}
                >
                  {g.title.split('·')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ minHeight: '300px' }}>
          <div className="card-header">
            <span className="card-title">{guides[activeGuide].title}</span>
          </div>
          <div className="card-body space-y-3 text-sm text-text-secondary">
            {guides[activeGuide].steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-accent-blue font-mono w-6">{step}</span>
                <span className="text-text-primary">{step.replace(/^\d+\.\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Registro de resultados (CSV)</span>
          </div>
          <div className="card-body">
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Al finalizar cada práctica, exporta el registro a CSV para incluirlo en tu informe.</p>
              <Button variant="primary">Exportar CSV</Button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Referencias para las prácticas</span>
          </div>
          <div className="card-body space-y-2 text-sm text-text-secondary">
            <p>Limahuaya, R. y Mamani, N. (2023). <i>Análisis del comportamiento de una turbina Francis...</i></p>
            <p>Guacheta, C. (2024). <i>Modelado Numérico de una Turbina Francis...</i></p>
            <p>Fuentes internacionales y universitarias de Mecánica de Fluidos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
