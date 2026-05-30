'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { LidarPoint } from '../hooks/useLidarSocket';

export interface LidarMapRef {
  captureSnapshot: () => string | null;
}

export interface LidarMapProps {
  points: LidarPoint[];
  isScanning: boolean;
  interactive?: boolean;
  artefacts?: any[];
  onMapClick?: (x: number, y: number) => void;
}

export const LidarMap = forwardRef<LidarMapRef, LidarMapProps>(({ 
  points, 
  isScanning, 
  interactive = false, 
  artefacts = [], 
  onMapClick 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>();

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return null;
    }
  }));

  // Match the ESP firmware's LIDAR_MAX_MM — never drop real readings
  const MAX_RADIUS_MM = 8000;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 5;
      
      // Scale factor: pixels per mm
      const scale = radius / MAX_RADIUS_MM;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Draw distance rings: 1m, 2m, 4m, 6m, 8m
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (const r of [1000, 2000, 4000, 6000, 8000]) {
        const pr = r * scale;
        if (pr > radius) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px Inter';
        ctx.fillText(`${r/1000}m`, cx + pr + 2, cy);
      }

      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // ==========================================
      // ROOM OUTLINE — ALL POINTS, NO LIMITS
      // ==========================================
      const sorted = [...points]
        .filter(p => p.distance > 0 && p.distance <= MAX_RADIUS_MM)
        .sort((a, b) => a.angle - b.angle)
        .map(p => {
          const rad = (p.angle - 90) * (Math.PI / 180);
          return {
            x: cx + p.distance * scale * Math.cos(rad),
            y: cy + p.distance * scale * Math.sin(rad),
            angle: p.angle,
          };
        });

      if (sorted.length > 1) {
        // ── Build segments — split only on angle gaps > 5° ──
        const segments: {x: number; y: number}[][] = [];
        let seg: {x: number; y: number}[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].angle - sorted[i - 1].angle > 5) {
            segments.push(seg);
            seg = [];
          }
          seg.push(sorted[i]);
        }
        segments.push(seg);

        // ── Draw filled polygon (semi-transparent) + outline ──
        segments.forEach(s => {
          if (s.length < 2) return;

          ctx.beginPath();
          ctx.moveTo(s[0].x, s[0].y);
          for (let i = 1; i < s.length; i++) {
            // Smooth bezier within segment
            const mx = (s[i - 1].x + s[i].x) / 2;
            const my = (s[i - 1].y + s[i].y) / 2;
            ctx.quadraticCurveTo(s[i - 1].x, s[i - 1].y, mx, my);
          }
          ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);

          // Fill back to sensor origin for room-outline look
          ctx.lineTo(cx, cy);
          ctx.lineTo(s[0].x, s[0].y);

          ctx.fillStyle = 'rgba(0, 255, 0, 0.07)';
          ctx.fill();

          // Draw the outline on top
          ctx.beginPath();
          ctx.moveTo(s[0].x, s[0].y);
          for (let i = 1; i < s.length; i++) {
            const mx = (s[i - 1].x + s[i].x) / 2;
            const my = (s[i - 1].y + s[i].y) / 2;
            ctx.quadraticCurveTo(s[i - 1].x, s[i - 1].y, mx, my);
          }
          ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // ── Glowing red dot at the live scan tip ──
        const latest = [...points]
          .filter(p => p.distance > 0 && p.distance <= MAX_RADIUS_MM)
          .slice(-1)[0];
        if (latest) {
          const rad = (latest.angle - 90) * (Math.PI / 180);
          const lpx = cx + latest.distance * scale * Math.cos(rad);
          const lpy = cy + latest.distance * scale * Math.sin(rad);
          ctx.beginPath();
          ctx.fillStyle = '#FF0000';
          ctx.shadowColor = '#FF0000';
          ctx.shadowBlur = 14;
          ctx.arc(lpx, lpy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      // ==========================================

      // Draw Artefacts if they exist
      if (artefacts && artefacts.length > 0) {
        artefacts.forEach(art => {
          const px = cx + art.x_pos * scale;
          const py = cy + art.y_pos * scale;
          
          // Draw marker
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = art.media_type === 'video' ? '#f59e0b' : '#00BFFF';
          ctx.fill();
          
          // Outer pulse ring
          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.strokeStyle = art.media_type === 'video' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(0, 191, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Label
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(art.header, px + 16, py + 4);
        });
      }

      // Center sensor dot
      ctx.fillStyle = '#00BFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00BFFF';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [points, isScanning, artefacts]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onMapClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Get mouse pos relative to canvas center
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;
    
    // Scale pixel coords back to mm coords
    const radius = Math.min(canvas.width, canvas.height) / 2 - 5;
    const scale = radius / MAX_RADIUS_MM;
    
    const mmX = x / scale;
    const mmY = y / scale;
    
    onMapClick(mmX, mmY);
  };

  return (
    <div className="map-canvas-container" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: 'block',
          width: '100%', 
          height: '100%', 
          cursor: interactive ? 'crosshair' : 'default' 
        }} 
        onClick={handleCanvasClick}
      />
      <div className="canvas-overlay-text">
        Grid: 1m | Max Range: {MAX_RADIUS_MM / 1000}m
      </div>
    </div>
  );
});
