'use client';

import React, { useEffect, useRef } from 'react';

interface ArtisticMountainCanvasProps {
  className?: string;
  intensity?: number;
  showConstellations?: boolean;
}

export default function ArtisticMountainCanvas({
  className = '',
  intensity = 1,
  showConstellations = true,
}: ArtisticMountainCanvasProps) {
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
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Constellation nodes (Greek mythology / Van Gogh inspired celestial points)
    const starCount = 42;
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.55),
        radius: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.008 * intensity;
      ctx.clearRect(0, 0, width, height);

      // ── 1. Deep Atmospheric Dusk Sky Gradient (Aero Deep Cyan-Indigo Obsidian) ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#080b10');
      skyGrad.addColorStop(0.35, '#0c121c');
      skyGrad.addColorStop(0.65, '#101a28');
      skyGrad.addColorStop(1, '#0b0e14');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // ── 2. Celestial Corona (Aero Cyan/Sky ambient glow behind distant peaks) ──
      const sunX = width * 0.52;
      const sunY = height * 0.42;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, Math.min(width, height) * 0.7);
      sunGlow.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
      sunGlow.addColorStop(0.25, 'rgba(2, 132, 199, 0.08)');
      sunGlow.addColorStop(0.6, 'rgba(56, 189, 248, 0.02)');
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.min(width, height) * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // ── 3. Constellations & Starfield ──
      if (showConstellations) {
        // Draw connecting gossamer lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(stars[j].x, stars[j].y);
            }
          }
        }
        ctx.stroke();

        // Draw Stars with subtle breathing pulse
        stars.forEach((star) => {
          const currentAlpha =
            star.alpha * (0.65 + 0.35 * Math.sin(time * 30 * star.pulseSpeed + star.pulsePhase));
          ctx.fillStyle = `rgba(224, 242, 254, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();

          // Delicate cyan star halo
          if (star.radius > 1.4) {
            ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // ── 4. Mountain Layer 1: Distant Misty High Sierras ──
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      const step1 = width / 60;
      for (let x = 0; x <= width; x += step1) {
        const nx = x * 0.003;
        const elevation =
          Math.sin(nx * 1.5 + 0.4) * 45 +
          Math.sin(nx * 3.8 + 1.2) * 25 +
          Math.cos(nx * 7.2) * 12;
        ctx.lineTo(x, height * 0.48 - elevation);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const layer1Grad = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.65);
      layer1Grad.addColorStop(0, 'rgba(20, 30, 45, 0.5)');
      layer1Grad.addColorStop(1, 'rgba(13, 19, 28, 0.75)');
      ctx.fillStyle = layer1Grad;
      ctx.fill();

      // ── 5. Mountain Layer 2: Mid-range Engraved Alpine Peaks ──
      ctx.beginPath();
      ctx.moveTo(0, height * 0.58);
      const step2 = width / 80;
      for (let x = 0; x <= width; x += step2) {
        const nx = x * 0.004;
        const elevation =
          Math.sin(nx * 2.1 + 2.8) * 60 +
          Math.sin(nx * 5.4 + 0.7) * 35 +
          Math.cos(nx * 9.5) * 16;
        ctx.lineTo(x, height * 0.58 - elevation);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const layer2Grad = ctx.createLinearGradient(0, height * 0.45, 0, height * 0.8);
      layer2Grad.addColorStop(0, 'rgba(16, 24, 36, 0.8)');
      layer2Grad.addColorStop(1, 'rgba(11, 15, 22, 0.94)');
      ctx.fillStyle = layer2Grad;
      ctx.fill();

      // Topographic Peak Edge Rim Highlight (Cyan / Slate)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── 6. Mountain Layer 3: Foreground Topographic Contours (Railway style) ──
      const contourCount = 7;
      for (let c = 0; c < contourCount; c++) {
        const cOffset = c * 24;
        const alpha = 0.08 + (c / contourCount) * 0.14;
        const isAccent = c === 3 || c === 5;

        ctx.beginPath();
        ctx.moveTo(0, height * 0.68 + cOffset);
        for (let x = 0; x <= width; x += 15) {
          const nx = x * 0.0035;
          const wave =
            Math.sin(nx * 3.2 + c * 0.4 + time * 0.4) * 28 +
            Math.cos(nx * 6.5 - c * 0.3) * 14 +
            Math.sin(nx * 1.2) * 20;
          ctx.lineTo(x, height * 0.68 + cOffset - wave);
        }

        ctx.strokeStyle = isAccent
          ? `rgba(56, 189, 248, ${alpha * 1.6})`
          : `rgba(14, 165, 233, ${alpha * 0.9})`;
        ctx.lineWidth = isAccent ? 1.4 : 0.85;
        ctx.stroke();
      }

      // ── 7. Foreground Solid Matte Base & Gradient Wash ──
      const baseGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
      baseGrad.addColorStop(0, 'rgba(11, 13, 17, 0)');
      baseGrad.addColorStop(0.5, 'rgba(11, 13, 17, 0.65)');
      baseGrad.addColorStop(1, 'rgba(11, 13, 17, 0.96)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, showConstellations]);

  return (
    <div className={`relative w-full h-full overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      {/* Subtle classical noise & matte texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
