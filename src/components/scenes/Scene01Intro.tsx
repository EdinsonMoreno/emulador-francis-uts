import { useRef, useEffect } from 'react';
import { drawRunnerEmblem } from '../../canvas/engines/runnerEmblem';

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
const CHEVRON = 'polygon(0% 0%, 55% 0%, 100% 50%, 55% 100%, 0% 100%, 45% 50%)';

export function Scene01Intro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let time = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      if (!ctx || !canvas) return;
      time += 1;
      drawRunnerEmblem(ctx, canvas.width, canvas.height, time);
      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#0A1128] via-[#0c1631] to-[#0A1128]">
      {/* ---- Geometría decorativa (derecha) ---- */}
      {/* Chevron grande esmeralda apuntando al rombo */}
      <div
        className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[34vmin] h-[42vmin] opacity-90"
        style={{
          clipPath: CHEVRON,
          background: 'linear-gradient(135deg, #10b981, #0e7490)',
          transform: 'translateY(-50%) translateX(28%) scaleX(-1)',
        }}
        aria-hidden
      />
      {/* Chevron cian, más fino */}
      <div
        className="absolute top-1/2 right-[20%] -translate-y-1/2 w-[24vmin] h-[30vmin]"
        style={{
          clipPath: CHEVRON,
          background: 'linear-gradient(135deg, rgba(34,211,238,0.55), rgba(34,211,238,0.05))',
          transform: 'translateY(-50%) scaleX(-1)',
        }}
        aria-hidden
      />
      {/* Rombos decorativos (slate) */}
      <div
        className="absolute bottom-[12%] right-[10%] w-[10vmin] h-[10vmin] bg-slate-600/30"
        style={{ clipPath: DIAMOND }}
        aria-hidden
      />
      <div
        className="absolute bottom-[20%] right-[4%] w-[6vmin] h-[6vmin] bg-emerald-500/20"
        style={{ clipPath: DIAMOND }}
        aria-hidden
      />

      {/* ---- Rombo principal con el rodete ---- */}
      <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[40vmin] h-[40vmin]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ clipPath: DIAMOND }}
        />
        {/* Marco esmeralda del rombo */}
        <div
          className="absolute inset-0 border-2 border-emerald-400/70"
          style={{ clipPath: DIAMOND, WebkitClipPath: DIAMOND } as React.CSSProperties}
        />
        <div className="absolute -inset-3 border border-cyan-400/20" style={{ clipPath: DIAMOND }} />
      </div>

      {/* ---- Marca institucional (arriba a la derecha) ---- */}
      <div data-anim className="absolute top-7 right-8 flex items-center gap-2.5 z-10">
        <div
          className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-cyan-500"
          style={{ clipPath: DIAMOND }}
        />
        <div className="leading-tight">
          <div className="text-sm font-bold text-white tracking-wide">UTS</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-cyan-300/90 font-mono">
            Campus Barrancabermeja
          </div>
        </div>
      </div>

      {/* ---- Contenido (izquierda) ---- */}
      <div className="absolute inset-y-0 left-0 w-[60%] flex flex-col justify-center gap-5 z-10">
        <span
          data-anim
          className="pl-12 text-xs uppercase tracking-[0.45em] text-cyan-300/90 font-mono"
        >
          Mecánica de Fluidos
        </span>

        {/* Banda del título */}
        <div
          data-anim
          className="bg-slate-900/70 backdrop-blur-md border-l-4 border-emerald-400 py-6 pl-12 pr-8 shadow-xl shadow-black/40"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-[0.95] tracking-tight">
            TURBINA
            <br />
            <span className="text-emerald-400">FRANCIS</span>
          </h1>
        </div>

        {/* Subtítulo / fecha */}
        <div data-anim className="pl-12">
          <div className="flex items-center gap-3 text-slate-200">
            <span className="text-sm font-semibold tracking-wide">Presentación Técnica</span>
            <span className="text-emerald-400">|</span>
            <span className="text-sm font-mono text-cyan-300/80">2026</span>
          </div>
          <div className="mt-1 h-[2px] w-44 bg-gradient-to-r from-emerald-400 to-transparent" />
        </div>

        {/* Integrantes + docente */}
        <div data-anim className="pl-12 space-y-2">
          <div className="text-xs uppercase tracking-[0.25em] text-cyan-300/90 font-mono">
            Integrantes
          </div>
          <ul className="space-y-1">
            {['Edinson A. Moreno Cepeda', 'Geiner Calderón Salas'].map((n) => (
              <li key={n} className="flex items-center gap-2.5 text-sm text-slate-100">
                <span
                  className="w-2 h-2 bg-emerald-400 shrink-0"
                  style={{ clipPath: DIAMOND }}
                />
                {n}
              </li>
            ))}
          </ul>
          <div className="pt-1 text-sm text-slate-100/95">
            <span className="text-cyan-300/90 font-mono text-xs uppercase tracking-[0.2em]">
              Docente:{' '}
            </span>
            Waldo David Silva
          </div>
        </div>

        {/* Pie */}
        <div data-anim className="pl-12 pt-2">
          <div className="text-sm font-semibold text-slate-200">
            Unidades Tecnológicas de Santander
          </div>
          <div className="text-[11px] text-slate-300/85 font-mono">
            www.uts.edu.co · Mecánica de Fluidos
          </div>
        </div>
      </div>
    </div>
  );
}
