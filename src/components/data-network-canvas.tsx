"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number };

/**
 * Ambient animated network of drifting nodes + connecting edges — evokes the
 * "data" in Intersel Insight (a dashboards/analytics product) rather than a
 * generic decorative effect. Pauses (renders one static frame) when the
 * viewer prefers reduced motion.
 */
export function DataNetworkCanvas({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const MAX_LINK_DIST = 150;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frameId = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = 16000; // px² per particle — tune for a soft, uncluttered field
      const count = Math.max(18, Math.min(64, Math.round((width * height) / density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
      }));
    }

    function frame() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist >= MAX_LINK_DIST) continue;
          ctx!.strokeStyle = `rgba(173, 199, 234, ${(1 - dist / MAX_LINK_DIST) * 0.32})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(particles[i].x, particles[i].y);
          ctx!.lineTo(particles[j].x, particles[j].y);
          ctx!.stroke();
        }
      }

      for (const p of particles) {
        ctx!.fillStyle = "rgba(214, 227, 245, 0.85)";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (!reduceMotion) frameId = requestAnimationFrame(frame);
    }

    resize();
    frame();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} style={style} />;
}
