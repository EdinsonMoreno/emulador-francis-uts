import { useEffect, useCallback, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import { useSceneStore } from '../store/sceneStore';
import { Scene01Intro } from './scenes/Scene01Intro';
import { Scene02Anatomia } from './scenes/Scene02Anatomia';
import { Scene03Cinematica } from './scenes/Scene03Cinematica';
import { Scene04Regulacion } from './scenes/Scene04Regulacion';
import { Scene05HillChart } from './scenes/Scene05HillChart';
import { Scene06Analisis } from './scenes/Scene06Analisis';

const scenes = [
  Scene01Intro,
  Scene02Anatomia,
  Scene03Cinematica,
  Scene04Regulacion,
  Scene05HillChart,
  Scene06Analisis,
];

const sceneLabels = [
  'Introducción',
  'Anatomía',
  'Cinemática',
  'Regulación',
  'Hill Chart',
  'Análisis',
];

// Transición tipo Prezi: zoom direccional del lienzo + entrada escalonada de
// los elementos marcados con [data-anim]. (anime.js v4 usa `ease`, no `easing`.)
function playTransition(direction: number) {
  animate('#scene-container', {
    opacity: [0, 1],
    scale: [1.08, 1],
    translateX: [direction * 70, 0],
    duration: 760,
    ease: 'outExpo',
  });
  animate('#scene-container [data-anim]', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 640,
    delay: stagger(95, { start: 160 }),
    ease: 'outExpo',
  });
}

export function Layout() {
  const currentScene = useSceneStore((s) => s.currentScene);
  const nextScene = useSceneStore((s) => s.nextScene);
  const prevScene = useSceneStore((s) => s.prevScene);
  const goToScene = useSceneStore((s) => s.goToScene);
  const prevSceneRef = useRef(currentScene);
  const [hintsOn, setHintsOn] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextScene();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevScene();
      if (e.key === 'h' || e.key === 'H') setHintsOn((v) => !v);
    },
    [nextScene, prevScene],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const direction = currentScene >= prevSceneRef.current ? 1 : -1;
    prevSceneRef.current = currentScene;
    playTransition(direction);
  }, [currentScene]);

  const SceneComponent = scenes[currentScene];

  return (
    <div
      className={`w-screen h-screen overflow-hidden bg-[#0A1128] text-slate-100 flex flex-col p-4 gap-3 ${
        hintsOn ? 'hints-on' : ''
      }`}
    >
      <nav className="h-14 px-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center z-20 shrink-0 shadow-lg shadow-black/30">
        <div className="flex items-center gap-2.5 text-sm font-sans">
          {sceneLabels.map((label, idx) => (
            <button
              key={label}
              onClick={() => goToScene(idx as 0 | 1 | 2 | 3 | 4 | 5)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                idx === currentScene
                  ? 'bg-emerald-500/90 text-slate-900 shadow-md shadow-emerald-500/30'
                  : 'text-slate-200/90 hover:text-slate-100 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 pr-1">
          <button
            onClick={() => setHintsOn((v) => !v)}
            title="Mostrar/ocultar guías (tecla H)"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
              hintsOn
                ? 'bg-emerald-500/90 text-slate-900 border-emerald-400'
                : 'text-slate-300/70 border-white/15 hover:text-slate-100 hover:bg-white/10'
            }`}
          >
            Guías · H
          </button>
          <span className="text-cyan-300/90 text-xs font-mono tracking-widest">
            {currentScene + 1} / 6
          </span>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden rounded-xl">
        {/* Capa de fondo animada (parallax sutil de glows). */}
        <div className="pointer-events-none absolute inset-0 anim-bg" aria-hidden />
        <div
          id="scene-container"
          key={currentScene}
          className="absolute inset-0 will-change-transform"
        >
          <SceneComponent />
        </div>
      </main>

      <footer className="h-16 px-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between z-20 shrink-0 shadow-lg shadow-black/30">
        <button
          onClick={prevScene}
          disabled={currentScene === 0}
          className="px-5 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-20 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-all font-medium"
        >
          ← Anterior
        </button>
        <div className="flex gap-2">
          {sceneLabels.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentScene
                  ? 'w-6 bg-cyan-400 shadow-md shadow-cyan-400/50'
                  : idx < currentScene
                    ? 'w-2 bg-cyan-400/40'
                    : 'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextScene}
          disabled={currentScene === 5}
          className="px-5 py-2 text-sm bg-emerald-500/90 hover:bg-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/30"
        >
          Siguiente →
        </button>
      </footer>
    </div>
  );
}
