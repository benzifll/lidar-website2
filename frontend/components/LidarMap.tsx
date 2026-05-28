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

  // Set max distance for a closer, zoomed-in view
  const MAX_RADIUS_MM = 2000; // 2 meters — fits typical room size
  
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
      const radius = Math.min(w, h) / 2 - 5; // 5px padding to make map as large as possible
      
      // Scale factor: pixels per mm
      const scale = radius / MAX_RADIUS_MM;

      // Clear canvas with slight fade for trails
      ctx.fillStyle = 'rgba(15, 17, 21, 0.8)';
      ctx.fillRect(0, 0, w, h);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      
      // 1m, 2m, 3m, 4m, 5m rings
      for (let r = 1000; r <= MAX_RADIUS_MM; r += 1000) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add text label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px Inter';
        ctx.fillText(`${r/1000}m`, cx + r * scale + 2, cy);
      }

      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Draw points
      points.forEach(p => {
        if (p.distance === 0 || p.distance > MAX_RADIUS_MM) return;
        
        // Convert polar to cartesian
        // RPLiDAR angle is 0 at top (forward), increasing clockwise
        const angleRad = (p.angle - 90) * (Math.PI / 180);
        const px = cx + (p.distance * scale) * Math.cos(angleRad);
        const py = cy + (p.distance * scale) * Math.sin(angleRad);

        // Color coding based on distance
        let color = '#10b981'; // Green (near)
        if (p.distance > 2000) color = '#f59e0b'; // Yellow (mid)
        if (p.distance > 4000) color = '#ef4444'; // Red (far)

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw scan line
      if (isScanning) {
        rotationRef.current = (rotationRef.current + 5) % 360;
        const scanAngle = (rotationRef.current - 90) * (Math.PI / 180);
        
        // Create pie slice gradient
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, scanAngle - 0.2, scanAngle, false);
        ctx.lineTo(cx, cy);
        
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(0, 191, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Leading line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(scanAngle), cy + radius * Math.sin(scanAngle));
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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
