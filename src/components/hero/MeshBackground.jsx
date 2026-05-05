import React, { useEffect, useRef } from 'react';

/**
 * Subtle particle-mesh canvas background.
 * Pure 2D canvas, no third-party particle library. About 80 lines.
 *
 * Particles drift slowly; nearby ones connect with thin lines whose alpha
 * scales with distance. Respects prefers-reduced-motion (renders a static
 * single frame instead of animating).
 */
export default function MeshBackground({
  density = 60,
  maxDistance = 130,
  className = '',
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let particles = [];

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      const count = Math.round((w * h) / 18000) + density;
      particles = new Array(count).fill(0).map(() => spawn(w, h));
    };

    const spawn = (w, h) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.8 + Math.random() * 1.6,
    });

    const draw = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radial vignette
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h));
      grad.addColorStop(0, 'rgba(34,211,238,0.04)');
      grad.addColorStop(1, 'rgba(11,18,32,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.35;
            ctx.strokeStyle = `rgba(34,211,238,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        ctx.fillStyle = 'rgba(34,211,238,0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      draw();
      animRef.current = requestAnimationFrame(tick);
    };

    resize();
    if (reduce) {
      draw();
    } else {
      animRef.current = requestAnimationFrame(tick);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [density, maxDistance]);

  return (
    <canvas
      ref={canvasRef}
      className={['absolute inset-0 w-full h-full block', className].join(' ')}
      aria-hidden="true"
    />
  );
}
