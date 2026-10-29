import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3, Group, Mesh } from 'three';

// BASE_URL respeta el `base` de Vite ('/' en dev, './' empaquetado) → la ruta
// del modelo funciona tanto en el navegador como en el .exe (file://).
const MODEL_URL = `${import.meta.env.BASE_URL}turbina.glb`;
const TARGET_SIZE = 3; // tamaño objetivo del lado mayor, en unidades de escena

export type SpinAxis = 'x' | 'y' | 'z';

/**
 * Normaliza el modelo: lo centra en el origen, lo escala a un tamaño conocido y
 * desactiva el frustum culling (la causa real del "no se ve": una bounding sphere
 * mal calculada hacía que three.js lo descartara del render).
 */
function useNormalizedModel() {
  const { scene } = useGLTF(MODEL_URL);
  return useMemo(() => {
    const object = scene.clone(true);
    object.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { object, center, scale: TARGET_SIZE / maxDim };
  }, [scene]);
}

interface TurbineModelProps {
  spinSpeed?: number; // velocidad de giro [rad/s]
  spinAxis?: SpinAxis; // eje de giro
}

export function TurbineModel({ spinSpeed = 0.6, spinAxis = 'x' }: TurbineModelProps) {
  const ref = useRef<Group>(null);
  const { object, center, scale } = useNormalizedModel();

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation[spinAxis] += spinSpeed * delta;
  });

  return (
    <group ref={ref} scale={scale}>
      <primitive object={object} position={[-center.x, -center.y, -center.z]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
