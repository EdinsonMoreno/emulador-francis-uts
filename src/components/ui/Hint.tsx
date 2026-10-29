// Burbuja de guía que aparece al pasar el cursor por el panel contenedor.
// Uso: poner la clase "group" en el panel y colocar <Hint text="..." /> adentro.
// Sirve de recordatorio para el expositor y, a la vez, es presentable al público.

type Side = 'top' | 'bottom' | 'left' | 'right';

const POS: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
  left: 'right-full top-1/2 -translate-y-1/2 mr-3',
  right: 'left-full top-1/2 -translate-y-1/2 ml-3',
};

export function Hint({ text, side = 'top' }: { text: string; side?: Side }) {
  return (
    <div
      data-hint
      className={`pointer-events-none absolute ${POS[side]} z-50 w-max max-w-[20rem] px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur border border-emerald-400/50 text-sm leading-snug text-slate-100 shadow-xl shadow-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
    >
      <span className="text-emerald-300 font-bold mr-1">▸</span>
      {text}
    </div>
  );
}
