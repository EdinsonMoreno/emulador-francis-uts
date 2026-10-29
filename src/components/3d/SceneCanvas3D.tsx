import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { TurbineModel, type SpinAxis } from './TurbineModel';
import { isWebGLAvailable } from '../../canvas/webgl';

interface SceneCanvas3DProps {
  orbitEnabled?: boolean;
  spinSpeed?: number;
  spinAxis?: SpinAxis;
  children?: React.ReactNode;
}

export function SceneCanvas3D({
  orbitEnabled = true,
  spinSpeed = 0.6,
  spinAxis = 'x',
  children,
}: SceneCanvas3DProps) {
  // Si el navegador tiene WebGL deshabilitado, no montamos el Canvas (evita la
  // cascada de "Error creating WebGL context") y mostramos cómo solucionarlo.
  if (!isWebGLAvailable()) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-5 shadow-lg shadow-black/30">
          <div className="text-3xl mb-2">🧊</div>
          <h3 className="text-lg font-bold text-white mb-1">WebGL no disponible</h3>
          <p className="text-sm text-slate-100/95 leading-snug">
            Tu navegador tiene la aceleración por hardware desactivada, así que no
            puede mostrar el modelo 3D. Activala en{' '}
            <span className="font-mono text-cyan-300">
              Configuración → Sistema → Usar aceleración por hardware
            </span>{' '}
            y reiniciá el navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [4, 2.5, 6], fov: 45 }}
      gl={{ antialias: true, toneMapping: 3 }}
      shadows
    >
      {/* Iluminación autosuficiente (no depende de HDR externos / internet). */}
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={2} castShadow />
      <directionalLight position={[-6, 4, -6]} intensity={0.6} />
      <hemisphereLight args={['#bcd4ff', '#0A1128', 0.6]} />
      <Suspense
        fallback={
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#1e293b" wireframe />
          </mesh>
        }
      >
        <TurbineModel spinSpeed={spinSpeed} spinAxis={spinAxis} />
        <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={12} blur={2.5} />
      </Suspense>
      {orbitEnabled && (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2}
          maxDistance={20}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.9}
        />
      )}
      {children}
    </Canvas>
  );
}
