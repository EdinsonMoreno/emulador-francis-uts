interface SketchfabEmbedProps {
  /** ID del modelo en Sketchfab (la parte tras /models/ y antes de /embed) */
  modelId: string;
  /** Título accesible del iframe */
  title: string;
  /** Texto del autor para la atribución (requerida por la licencia de Sketchfab) */
  author: string;
  /** URL del perfil del autor */
  authorUrl: string;
  /** URL pública del modelo (página, no el embed) */
  modelUrl: string;
}

// Parámetros del visor: tema oscuro, autostart y la mayor parte de la UI interna
// de Sketchfab oculta para una presentación más limpia (el badge superior, ayuda,
// settings, etc.). Doc: https://sketchfab.com/developers/viewer/embed
// IMPORTANTE: autostart=0 + preload=0 → el iframe muestra un póster estático y
// NO crea un contexto WebGL hasta que el usuario hace clic en "play". Sin esto,
// con varios visores 3D a la vez (modelo local + 2 iframes) se agota el límite de
// contextos WebGL del navegador y los visores fallan ("Something went wrong").
const VIEWER_PARAMS = [
  'autostart=0',
  'preload=0',
  'ui_theme=dark',
  'ui_infos=0', // oculta el badge de título/autor (arriba-izquierda)
  'ui_inspector=0',
  'ui_hint=0',
  'ui_help=0',
  'ui_settings=0',
  'ui_watermark=0',
  'ui_ar=0',
  'ui_vr=0',
  'ui_annotations=0',
  'ui_controls=1', // dejamos los controles para poder rotar
  'dnt=1',
  'transparent=0',
].join('&');

export function SketchfabEmbed({
  modelId,
  title,
  author,
  authorUrl,
  modelUrl,
}: SketchfabEmbedProps) {
  const src = `https://sketchfab.com/models/${modelId}/embed?${VIEWER_PARAMS}`;

  return (
    <div className="absolute inset-0 flex flex-col">
      <iframe
        title={title}
        src={src}
        className="flex-1 w-full border-0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        // @ts-expect-error atributos no estándar requeridos por Sketchfab
        mozallowfullscreen="true"
        webkitallowfullscreen="true"
        xr-spatial-tracking="true"
        execution-while-out-of-viewport="true"
        execution-while-not-rendered="true"
        web-share="true"
      />
      <p className="shrink-0 px-3 py-1 text-[11px] text-white/35 font-mono bg-black/30">
        <a
          href={modelUrl}
          target="_blank"
          rel="nofollow noreferrer"
          className="text-sky-400/80 hover:text-sky-300"
        >
          {title}
        </a>{' '}
        por{' '}
        <a
          href={authorUrl}
          target="_blank"
          rel="nofollow noreferrer"
          className="text-sky-400/80 hover:text-sky-300"
        >
          {author}
        </a>{' '}
        en Sketchfab
      </p>
    </div>
  );
}
