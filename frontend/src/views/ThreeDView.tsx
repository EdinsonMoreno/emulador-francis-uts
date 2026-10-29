import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { isWebGLAvailable } from '../canvas/webgl';

export function TurbineModel({ spinSpeed = 0.6, spinAxis = 'x' }: { spinSpeed?: number; spinAxis?: 'x' | 'y' | 'z' }) {
  const ref = useRef<any>(null);
  const { scene } = useGLTF('/turbina.glb');

  useFrame((_, delta) => {
    if (ref.current && delta) {
      ref.current.rotation[spinAxis] += spinSpeed * delta;
    }
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

export function ThreeDView() {
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x');
  const [speed, setSpeed] = useState(30);

  if (!isWebGLAvailable()) {
    return (
      <div className="view">
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="text-4xl mb-4">🧊</div>
          <h3 className="text-xl font-bold mb-2">WebGL no disponible</h3>
          <p className="text-text-secondary">
            La aceleración por hardware está desactivada. Activala en
            Configuración → Sistema → Usar aceleración por hardware.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="grid-2c-80-20">
        {/* Canvas 3D */}
        <div className="relative flex-1" style={{ height: '100%' }}>
          <Canvas
            camera={{ position: [4, 2.5, 6], fov: 45 }}
            gl={{ antialias: true, toneMapping: 3 }}
            shadows
          >
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 10]} intensity={2} castShadow />
            <directionalLight position={[-6, 4, -6]} intensity={0.6} />
            <hemisphereLight args={['#bcd4ff', '#080B14', 0.6]} />
            <Suspense fallback={<mesh><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#1E293B" wireframe /></mesh>}>
              <TurbineModel spinSpeed={(speed / 100) * 2.5} spinAxis={axis} />
              <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={12} blur={2.5} />
            </Suspense>
            <OrbitControls
              makeDefault
              enablePan={false}
              minDistance={2}
              maxDistance={20}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 1.9}
            />
          </Canvas>
        </div>

        {/* Panel lateral */}
        <div className="w-2/5 p-4 space-y-3">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Rotación automática</span>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((a) => (
                  <button
                    key={a}
                    className={`btn btn-sm w-full ${axis === a ? 'btn-primary' : ''}`}
                    onClick={() => setAxis(a)}
                  >
                    Eje {a.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <div className="slider-group">
                  <label className="slider-label">
                    <span>Velocidad</span>
                    <span className="slider-value">{speed}%</span>
                  </label>
                  <input
                    type="range"
                    className="slider-input"
                    min={0}
                    max={100}
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Módulos del rodete</span>
            </div>
            <div className="card-body space-y-2">
              {['Cámara espiral', 'Álabes directrices', 'Rodete (runner)', 'Tubo de aspiración'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-text-secondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
