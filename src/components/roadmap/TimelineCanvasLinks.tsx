import { useEffect, useRef } from 'react';

export interface TimelineLink {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isConflict: boolean;
  sourceLabel: string;
  targetLabel: string;
}

interface TimelineCanvasLinksProps {
  width: number;
  viewportHeight: number;
  scrollTop: number;
  links: TimelineLink[];
}

export function TimelineCanvasLinks({ width, viewportHeight, scrollTop, links }: TimelineCanvasLinksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set real size for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = viewportHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, viewportHeight);

    links.forEach(link => {
      const { sourceX, targetX, isConflict } = link;
      const sourceY = link.sourceY - scrollTop;
      const targetY = link.targetY - scrollTop;

      // Skip rendering if both source and target are outside vertical viewport
      if ((sourceY < 0 && targetY < 0) || (sourceY > viewportHeight && targetY > viewportHeight)) {
        return;
      }

      const color = isConflict ? "#ef4444" : "#3b82f6"; // Tailwind red-500 and blue-500
      const strokeWidth = isConflict ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.moveTo(targetX, targetY);
      
      const controlPointOffset = Math.abs(sourceX - targetX) / 2 || 50;
      
      ctx.bezierCurveTo(
        targetX + controlPointOffset, targetY,
        sourceX - controlPointOffset, sourceY,
        sourceX, sourceY
      );

      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      // Remove neon aesthetics to keep a quiet enterprise UI
      ctx.globalAlpha = isConflict ? 0.9 : 0.6;
      ctx.stroke();

      // Draw arrow marker
      drawArrowhead(ctx, sourceX, sourceY, sourceX - controlPointOffset, sourceY, color);
    });
  }, [width, viewportHeight, scrollTop, links]);

  // Helper to draw an arrowhead at the end of the bezier curve
  const drawArrowhead = (ctx: CanvasRenderingContext2D, x: number, y: number, cx: number, cy: number, color: string) => {
    // Angle from control point to end point
    const angle = Math.atan2(y - cy, x - cx);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8 * Math.cos(angle - Math.PI / 6), y - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - 8 * Math.cos(angle + Math.PI / 6), y - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 pointer-events-none z-20"
      style={{ width, height: viewportHeight, top: scrollTop }}
    />
  );
}
