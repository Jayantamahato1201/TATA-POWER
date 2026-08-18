import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const HeroEnergyCanvas: React.FC = () => {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes for grid simulation
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      pulseSpeed: number;
      baseAlpha: number;
      color: string;
    }

    interface EnergyStream {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      progress: number;
      speed: number;
      length: number;
      color: string;
    }

    const particles: Particle[] = [];
    const particleCount = Math.min(Math.floor((width * height) / 14000), 75);

    const colors = [
      'rgba(56, 189, 248, ', // Sky cyan
      'rgba(32, 92, 165, ',  // Tata blue
      'rgba(96, 165, 250, ', // Light blue
      'rgba(0, 255, 65, ',   // Green accent (rare)
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.6 + 0.2,
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const energyStreams: EnergyStream[] = [];
    const maxStreams = 8;

    const createStream = () => {
      const p1 = particles[Math.floor(Math.random() * particles.length)];
      const p2 = particles[Math.floor(Math.random() * particles.length)];
      if (p1 && p2 && p1 !== p2) {
        energyStreams.push({
          x: p1.x,
          y: p1.y,
          targetX: p2.x,
          targetY: p2.y,
          progress: 0,
          speed: Math.random() * 0.015 + 0.008,
          length: Math.random() * 0.2 + 0.1,
          color: Math.random() > 0.3 ? '#38BDF8' : '#00FF41',
        });
      }
    };

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Subtle isometric grid lines
      ctx.strokeStyle = isDark ? 'rgba(30, 41, 59, 0.25)' : 'rgba(203, 213, 225, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 60;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Connecting network web between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.25;
            ctx.strokeStyle = `rgba(32, 92, 165, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Spawn occasional energy streams along connections
      if (tick % 45 === 0 && energyStreams.length < maxStreams) {
        createStream();
      }

      // Update & Draw Energy Streams (pulse packets)
      for (let s = energyStreams.length - 1; s >= 0; s--) {
        const stream = energyStreams[s];
        stream.progress += stream.speed;

        const currentX = stream.x + (stream.targetX - stream.x) * stream.progress;
        const currentY = stream.y + (stream.targetY - stream.y) * stream.progress;

        const tailProgress = Math.max(0, stream.progress - stream.length);
        const tailX = stream.x + (stream.targetX - stream.x) * tailProgress;
        const tailY = stream.y + (stream.targetY - stream.y) * tailProgress;

        const gradient = ctx.createLinearGradient(tailX, tailY, currentX, currentY);
        gradient.addColorStop(0, 'rgba(32, 92, 165, 0)');
        gradient.addColorStop(1, stream.color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        // Glowing packet head
        ctx.fillStyle = stream.color;
        ctx.shadowColor = stream.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (stream.progress >= 1) {
          energyStreams.splice(s, 1);
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Bounce from edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Pulse alpha
        p.alpha = p.baseAlpha + Math.sin(tick * p.pulseSpeed) * 0.25;

        // Draw particle
        ctx.fillStyle = `${p.color}${Math.max(0.1, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow around some nodes
        if (p.size > 2) {
          ctx.fillStyle = `${p.color}0.15)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
    />
  );
};
