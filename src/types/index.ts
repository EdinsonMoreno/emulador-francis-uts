export interface PhysicsParams {
  Q: number;
  alpha: number;
}

export interface DerivedQuantities {
  P: number;    // Potencia al eje [W]
  eta: number;  // Rendimiento total [-]
  omega: number; // Velocidad angular [rad/s]
  V: number;    // Velocidad absoluta a la entrada del rodete V1 [m/s]
  U: number;    // Velocidad periférica U1 = omega*r1 [m/s]
  Vu: number;   // Componente de giro de V1 (Vu1) [m/s]
  Vm: number;   // Componente meridional de V1 (Vm1) [m/s]
  W: number;    // Velocidad relativa W1 [m/s]
  HE: number;   // Altura de Euler [m]
}

export interface AnimationContract {
  duration: number;
  easing: string;
  onComplete?: () => void;
}

export type TransitionType = 'camera' | 'inertia' | 'explode' | 'fade';

export type SceneIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface SceneConfig {
  id: SceneIndex;
  title: string;
  subtitle: string;
  mode: '2d' | '3d' | '3d+2d';
}
