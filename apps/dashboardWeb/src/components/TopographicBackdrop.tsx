'use client';

import React from 'react';

interface TopographicBackdropProps {
  className?: string;
  opacity?: number;
}

export default function TopographicBackdrop({
  className = '',
  opacity = 0.04,
}: TopographicBackdropProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ opacity }}
    >
      {/* Topographic Contour Isobars SVG */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-100 200 C 200 150, 400 350, 800 250 C 1200 150, 1400 320, 1600 220"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />
        <path
          d="M-100 280 C 220 220, 440 420, 820 320 C 1220 220, 1380 390, 1600 290"
          stroke="#0ea5e9"
          strokeWidth="1"
        />
        <path
          d="M-100 360 C 240 290, 460 500, 850 400 C 1240 300, 1360 460, 1600 370"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />
        <path
          d="M-100 450 C 260 380, 480 590, 890 490 C 1260 390, 1340 550, 1600 460"
          stroke="#0ea5e9"
          strokeWidth="1"
        />
        <path
          d="M-100 550 C 280 470, 520 680, 930 580 C 1280 480, 1330 640, 1600 560"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />
        <path
          d="M-100 660 C 300 570, 560 780, 980 680 C 1300 580, 1320 740, 1600 660"
          stroke="#0ea5e9"
          strokeWidth="1"
        />

        {/* Ambient Topographic Ridge Peaks */}
        <circle cx="480" cy="500" r="180" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 6" />
        <circle cx="480" cy="500" r="120" stroke="#0ea5e9" strokeWidth="0.8" />
        <circle cx="480" cy="500" r="60" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="480" cy="500" r="3" fill="#38bdf8" />

        <circle cx="1180" cy="360" r="220" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="3 5" />
        <circle cx="1180" cy="360" r="150" stroke="#38bdf8" strokeWidth="0.8" />
        <circle cx="1180" cy="360" r="80" stroke="#0ea5e9" strokeWidth="1" />
        <circle cx="1180" cy="360" r="3" fill="#0ea5e9" />
      </svg>

      {/* Top subtle cyan dusk vignette */}
      <div
        className="absolute top-0 inset-x-0 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 900px 400px at 50% -100px, rgba(56, 189, 248, 0.05), transparent 70%)',
        }}
      />
    </div>
  );
}
