import { create } from 'zustand';
import type { PhysicsParams, DerivedQuantities, SceneIndex } from '../types';

interface SceneState {
  currentScene: SceneIndex;
  physics: PhysicsParams;
  derived: DerivedQuantities;
  nextScene: () => void;
  prevScene: () => void;
  goToScene: (id: SceneIndex) => void;
  setQ: (q: number) => void;
  setAlpha: (alpha: number) => void;
}

// --- Parámetros fijos de la turbina (punto de diseño) ---
const g = 9.81; // gravedad [m/s^2]
const rho = 1000; // densidad del agua [kg/m^3]
const H = 50; // altura neta disponible [m]
const r1 = 1.0; // radio de entrada al rodete [m]
const b1 = 0.2; // altura del álabe a la entrada [m]
const omega = 30; // velocidad angular SÍNCRONA, constante [rad/s] (~286 rpm)
const etaMec = 0.97; // rendimiento mecánico (cojinetes, etc.)
const Cf = 0.018; // coef. de pérdidas por fricción (crecen con Q^2)
const Cs = 0.05; // coef. de pérdidas por choque/incidencia (fuera del ángulo de diseño)

const A1 = 2 * Math.PI * r1 * b1; // área de paso a la entrada del rodete [m^2]

function computeDerived(Q: number, alpha: number): DerivedQuantities {
  // Triángulo de velocidades a la entrada del rodete (índice 1).
  const U = omega * r1; // velocidad periférica U1 = omega*r1
  const Vm = Q / A1; // componente meridional, por continuidad: Q = Vm * A1
  const Vu = Vm / Math.tan(alpha); // componente de giro, fija por el ángulo del distribuidor
  const V = Math.hypot(Vm, Vu); // velocidad absoluta V1
  const Wu = Vu - U; // componente de giro de la velocidad relativa
  const W = Math.hypot(Vm, Wu); // velocidad relativa W1

  // Ecuación de Euler de turbomáquinas (salida sin remolino, Vu2 = 0):
  // H_Euler = U1*Vu1/g
  const HE = (U * Vu) / g;

  // Modelo de pérdidas hidráulicas:
  //  - fricción: crece con el caudal (~Q^2)
  //  - choque: mínima cuando Vu1 = Vu_opt (acople perfecto, H_Euler = H)
  const VuOpt = (g * H) / U;
  const hFric = Cf * Q * Q;
  const hShock = Cs * (Vu - VuOpt) ** 2;

  // Altura útil: no puede superar la disponible H, ni a la de Euler.
  const Hutil = Math.max(0, Math.min(HE, H) - hFric - hShock);

  const eta = Math.min((Hutil / H) * etaMec, 0.95); // rendimiento total
  const P = rho * g * Q * H * eta; // potencia al eje [W]

  return { P, eta, omega, V, U, Vu, Vm, W, HE };
}

export const useSceneStore = create<SceneState>((set) => ({
  currentScene: 0 as SceneIndex,
  physics: { Q: 10, alpha: Math.PI / 6 },
  derived: computeDerived(10, Math.PI / 6),

  nextScene: () =>
    set((state) => {
      const next = Math.min(state.currentScene + 1, 5) as SceneIndex;
      return { currentScene: next };
    }),

  prevScene: () =>
    set((state) => {
      const prev = Math.max(state.currentScene - 1, 0) as SceneIndex;
      return { currentScene: prev };
    }),

  goToScene: (id) => set({ currentScene: id }),

  setQ: (q) =>
    set((state) => ({
      physics: { ...state.physics, Q: q },
      derived: computeDerived(q, state.physics.alpha),
    })),

  setAlpha: (alpha) =>
    set((state) => ({
      physics: { ...state.physics, alpha },
      derived: computeDerived(state.physics.Q, alpha),
    })),
}));
