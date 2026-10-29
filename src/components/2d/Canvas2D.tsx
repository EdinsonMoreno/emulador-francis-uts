import { useRef, useEffect, useCallback } from 'react';

interface Canvas2DProps {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function Canvas2D({ draw, width, height, className }: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = width || canvas.parentElement?.clientWidth || 600;
    const h = height || canvas.parentElement?.clientHeight || 400;
    canvas.width = w;
    canvas.height = h;
    draw(ctx, w, h);
  }, [draw, width, height]);

  useEffect(() => {
    render();
    const observer = new ResizeObserver(render);
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
