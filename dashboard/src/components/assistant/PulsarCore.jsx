import { useRef, useEffect, useCallback } from 'react';

const COLORS = {
  cyan: '#00f0ff',
  blue: '#0088ff',
  red: '#ff3333',
  amber: '#f59e0b',
};

function lerp(a, b, t) { return a + (b - a) * t; }

export default function PulsarCore({ status = 'SECURE', isSpeaking = false, size = 320 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);
  const prevTimeRef = useRef(0);

  const getColor = useCallback(() => {
    if (status === 'ATTACK' || status === 'CRITICAL' || status === 'THREAT') return COLORS.red;
    if (status === 'WARNING') return COLORS.amber;
    return COLORS.cyan;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.42;

    // Init particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 60; i++) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * maxR * 0.8,
          speed: (Math.random() - 0.5) * 0.02,
          size: Math.random() * 2 + 0.5,
          life: Math.random(),
        });
      }
    }

    function draw(time) {
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.05);
      prevTimeRef.current = time;

      ctx.clearRect(0, 0, size, size);
      const color = getColor();
      const t = time / 1000;

      // Outer glow
      const outerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.6, cx, cy, maxR * 1.1);
      outerGrad.addColorStop(0, 'transparent');
      outerGrad.addColorStop(0.7, color + '08');
      outerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, size, size);

      // Core glow
      const coreSize = maxR * 0.25 * (1 + Math.sin(t * 2) * 0.08);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      coreGrad.addColorStop(0, color + 'cc');
      coreGrad.addColorStop(0.4, color + '44');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // Rings
      const rings = [
        { r: maxR * 0.4, w: 2, speed: 0.3, segments: 8 },
        { r: maxR * 0.6, w: 1.5, speed: -0.2, segments: 12 },
        { r: maxR * 0.8, w: 1, speed: 0.15, segments: 16 },
      ];

      rings.forEach(ring => {
        const segAngle = (Math.PI * 2) / ring.segments;
        const offset = t * ring.speed;

        ctx.strokeStyle = color + '40';
        ctx.lineWidth = ring.w;

        for (let i = 0; i < ring.segments; i++) {
          const startA = offset + i * segAngle + segAngle * 0.1;
          const endA = offset + (i + 1) * segAngle - segAngle * 0.1;
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, startA, endA);
          ctx.stroke();
        }
      });

      // Particles
      particlesRef.current.forEach(p => {
        p.angle += p.speed;
        p.life += dt * 0.3;
        if (p.life > 1) {
          p.life = 0;
          p.radius = Math.random() * maxR * 0.8;
        }

        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        const alpha = Math.sin(p.life * Math.PI) * 0.6;

        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Speaking wave
      if (isSpeaking) {
        const waveR = maxR * 0.35 + Math.sin(t * 8) * maxR * 0.05;
        ctx.strokeStyle = color + '60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Attack lightning
      if (status === 'ATTACK' || status === 'CRITICAL' || status === 'THREAT') {
        if (Math.random() > 0.7) {
          ctx.strokeStyle = COLORS.red + '80';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let lx = cx, ly = cy;
          const steps = 6;
          for (let i = 0; i < steps; i++) {
            lx += (Math.random() - 0.5) * maxR * 0.3;
            ly += (Math.random() - 0.5) * maxR * 0.3;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
      }

      // Status text
      ctx.fillStyle = color;
      ctx.font = `bold ${size * 0.03}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('P.U.L.S.A.R', cx, cy + maxR + 15);

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [size, status, isSpeaking, getColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        cursor: 'pointer',
        transition: 'filter 0.3s',
      }}
    />
  );
}
