// Detecta si el navegador puede crear un contexto WebGL. En Chrome con la
// aceleración por hardware desactivada, GL_VENDOR/GL_RENDERER quedan "Disabled"
// y three.js lanza "Error creating WebGL context". Con esto evitamos montar el
// <Canvas> y mostramos un fallback en lugar de inundar la consola de errores.
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}
