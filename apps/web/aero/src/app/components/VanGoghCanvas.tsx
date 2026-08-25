'use client';

import React, { useEffect, useRef } from 'react';

export interface VanGoghCanvasProps {
  className?: string;
  intensity?: number;
  showConstellations?: boolean;
  showSwirls?: boolean;
  showMountains?: boolean;
  showContours?: boolean;
  starCount?: number;
}

export default function VanGoghCanvas({
  className = '',
  intensity = 1,
  showConstellations = true,
  showSwirls = true,
  showMountains = true,
  showContours = true,
  starCount = 48,
}: VanGoghCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Dynamic star count based on screen width
    const effectiveStarCount = width < 768 ? Math.min(starCount, 24) : starCount;

    // Constellation nodes (Greek mythology / Van Gogh Starry Night inspired celestial points)
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
      isWheatGold: boolean;
    }> = [];

    for (let i = 0; i < effectiveStarCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.65),
        radius: Math.random() * 1.7 + 0.6,
        alpha: Math.random() * 0.65 + 0.25,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
        isWheatGold: i % 7 === 0, // Van Gogh wheat-gold celestial accents
      });
    }

    // Van Gogh swirl centers for Starry Night fluid aesthetics
    const swirlCenters = [
      { rx: 0.28, ry: 0.28, maxR: 130, speed: 0.25, segments: 45 },
      { rx: 0.74, ry: 0.36, maxR: 100, speed: -0.32, segments: 38 },
      { rx: 0.52, ry: 0.18, maxR: 160, speed: 0.18, segments: 52 },
    ];

    let time = 0;

    const render = () => {
      if (!prefersReducedMotion) {
        time += 0.008 * intensity;
      }
      ctx.clearRect(0, 0, width, height);

      // ── 1. Deep Atmospheric Starry Sky Gradient (Van Gogh Indigo & Obsidian) ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#050710');
      skyGrad.addColorStop(0.2, '#080d1a');
      skyGrad.addColorStop(0.45, '#0c1428');
      skyGrad.addColorStop(0.7, '#101a30');
      skyGrad.addColorStop(1, '#080b12');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // ── 2. Van Gogh Swirling Nebulae (Starry Night Impasto Strokes) ──
      if (showSwirls && width > 480) {
        swirlCenters.forEach((swirl) => {
          const cx = width * swirl.rx;
          const cy = height * swirl.ry;
          ctx.beginPath();
          for (let i = 0; i < swirl.segments; i++) {
            const angle = (i / swirl.segments) * Math.PI * 3.5 + time * swirl.speed;
            const r = swirl.maxR * (1 - i / swirl.segments) * 0.9;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r * 0.75; // slight elliptical perspective
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          const swirlAlpha = 0.04 + Math.sin(time * 0.6 + swirl.rx * 10) * 0.02;
          ctx.strokeStyle = `rgba(56, 189, 248, ${swirlAlpha})`;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Counter-swirl indigo shadow line
          ctx.beginPath();
          for (let i = 0; i < swirl.segments; i++) {
            const angle = (i / swirl.segments) * Math.PI * 3.5 + time * swirl.speed + 0.3;
            const r = swirl.maxR * 0.85 * (1 - i / swirl.segments) * 0.9;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r * 0.75;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = `rgba(45, 58, 106, ${swirlAlpha * 1.5})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        });
      }

      // ── 3. Celestial Corona (Aero Cyan / Sky ambient glow behind distant peaks) ──
      const sunX = width * 0.52;
      const sunY = height * 0.40;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, Math.min(width, height) * 0.75);
      sunGlow.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      sunGlow.addColorStop(0.25, 'rgba(2, 132, 199, 0.07)');
      sunGlow.addColorStop(0.55, 'rgba(45, 58, 106, 0.03)');
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.min(width, height) * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // ── 4. Constellations & Starfield ──
      if (showConstellations) {
        // Draw connecting gossamer lines (mesh network metaphor)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 125) {
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

          if (star.isWheatGold) {
            // Van Gogh wheat-gold star
            ctx.fillStyle = `rgba(212, 168, 85, ${currentAlpha})`;
          } else {
            // Warm parchment star
            ctx.fillStyle = `rgba(243, 240, 234, ${currentAlpha})`;
          }

          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();

          // Delicate star halo
          if (star.radius > 1.3) {
            ctx.fillStyle = star.isWheatGold
              ? `rgba(212, 168, 85, ${currentAlpha * 0.25})`
              : `rgba(56, 189, 248, ${currentAlpha * 0.28})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // ── 5. Mountain Layer 1: Distant Misty High Ridges ──
      if (showMountains) {
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
        layer1Grad.addColorStop(0, 'rgba(20, 30, 50, 0.5)');
        layer1Grad.addColorStop(1, 'rgba(13, 19, 28, 0.75)');
        ctx.fillStyle = layer1Grad;
        ctx.fill();

        // ── 6. Mountain Layer 2: Mid-range Engraved Alpine Peaks ──
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
        layer2Grad.addColorStop(0, 'rgba(16, 24, 40, 0.82)');
        layer2Grad.addColorStop(1, 'rgba(11, 15, 22, 0.95)');
        ctx.fillStyle = layer2Grad;
        ctx.fill();

        // Topographic Peak Edge Rim Highlight (Cyan / Slate)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // ── 7. Mountain Layer 3: Foreground Topographic Contours (Railway style) ──
      if (showContours) {
        const contourCount = 6;
        for (let c = 0; c < contourCount; c++) {
          const cOffset = c * 24;
          const alpha = 0.06 + (c / contourCount) * 0.12;
          const isAccent = c === 2 || c === 4;

          ctx.beginPath();
          ctx.moveTo(0, height * 0.68 + cOffset);
          for (let x = 0; x <= width; x += 15) {
            const nx = x * 0.0035;
            const wave =
              Math.sin(nx * 3.2 + c * 0.4 + time * 0.4) * 26 +
              Math.cos(nx * 6.5 - c * 0.3) * 12 +
              Math.sin(nx * 1.2) * 18;
            ctx.lineTo(x, height * 0.68 + cOffset - wave);
          }

          ctx.strokeStyle = isAccent
            ? `rgba(56, 189, 248, ${alpha * 1.5})`
            : `rgba(14, 165, 233, ${alpha * 0.85})`;
          ctx.lineWidth = isAccent ? 1.3 : 0.8;
          ctx.stroke();
        }
      }

      // ── 8. Foreground Solid Matte Base & Gradient Wash ──
      const baseGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
      baseGrad.addColorStop(0, 'rgba(8, 11, 18, 0)');
      baseGrad.addColorStop(0.5, 'rgba(8, 11, 18, 0.65)');
      baseGrad.addColorStop(1, 'rgba(8, 11, 18, 0.98)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [intensity, showConstellations, showSwirls, showMountains, showContours, starCount]);

  return (
    <div className={`relative w-full h-full overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
