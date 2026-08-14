'use client';

import React from 'react';

interface StickFigureMeetingIllustrationProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function StickFigureMeetingIllustration({
  className = '',
  width = 520,
  height = 260,
}: StickFigureMeetingIllustrationProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 520 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      style={{ color: '#88909c', opacity: 0.85 }}
    >
      {/* ── Floor Reference Line ── */}
      <line
        x1="20"
        y1="225"
        x2="500"
        y2="225"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="6 8"
        opacity="0.4"
      />

      {/* ── 1. Whiteboard on Left ── */}
      <g opacity="0.6">
        {/* Frame & Board */}
        <rect
          x="30"
          y="60"
          width="60"
          height="80"
          rx="4"
          fill="#11141a"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        {/* Whiteboard Stand */}
        <line x1="60" y1="140" x2="45" y2="225" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="60" y1="140" x2="75" y2="225" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Diagram sketches inside whiteboard */}
        <rect x="40" y="72" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <line x1="49" y1="84" x2="49" y2="94" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="49" cy="100" r="4" stroke="currentColor" strokeWidth="1.2" />
        <line x1="53" y1="100" x2="72" y2="100" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
        <rect x="68" y="72" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <line x1="38" y1="120" x2="82" y2="120" stroke="currentColor" strokeWidth="1.2" />
      </g>

      {/* ── 2. Speech Bubble (Dialogue) ── */}
      <g transform="translate(130, 16)">
        {/* Speech Bubble Box with Tail pointing to Presenter */}
        <path
          d="M 16 0 
             H 320 
             A 14 14 0 0 1 334 14 
             V 46 
             A 14 14 0 0 1 320 60 
             H 40 
             L 12 76 
             L 22 60 
             H 16 
             A 14 14 0 0 1 2 46 
             V 14 
             A 14 14 0 0 1 16 0 Z"
          fill="#161a22"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <text
          x="168"
          y="35"
          textAnchor="middle"
          fill="#f3f0ea"
          fontSize="13.5"
          fontWeight="600"
          fontFamily="var(--font-title, sans-serif)"
          letterSpacing="-0.01em"
        >
          &ldquo;we need to create an organization here&rdquo;
        </text>
      </g>

      {/* ── 3. Presenter Stick Figure (Standing, completely connected lines) ── */}
      <g>
        {/* Head */}
        <circle cx="125" cy="95" r="16" fill="#11141a" stroke="currentColor" strokeWidth="2" />
        {/* Friendly minimalist eyes & smile */}
        <circle cx="120" cy="92" r="1.6" fill="currentColor" />
        <circle cx="130" cy="92" r="1.6" fill="currentColor" />
        <path d="M121 100 Q125 104 129 100" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        
        {/* Spine / Torso (Continuous line from base of head) */}
        <line x1="125" y1="111" x2="125" y2="168" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

        {/* Legs (Continuous branching from pelvis) */}
        <path
          d="M110 225 L125 168 L140 225"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Left Arm: Gesturing toward the meeting room table & speech bubble */}
        <path
          d="M125 124 L148 132 L172 120"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right Arm: Confident pose on waist */}
        <path
          d="M125 124 L104 138 L114 154"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* ── 4. Conference Meeting Table (Ready for the new team) ── */}
      <g>
        {/* Table Top Surface with depth */}
        <path
          d="M 185 164 
             C 185 152, 455 152, 455 164 
             L 460 178 
             C 460 190, 180 190, 180 178 
             Z"
          fill="#11141a"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Table Rim Highlight Line */}
        <path
          d="M 180 178 C 220 188, 420 188, 460 178"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Sturdy Table Legs to Floor */}
        <line x1="205" y1="184" x2="205" y2="225" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="320" y1="186" x2="320" y2="225" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="435" y1="184" x2="435" y2="225" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

        {/* Laptop on table */}
        <path d="M305 162 L335 162 L339 168 L301 168 Z" fill="#161a22" stroke="currentColor" strokeWidth="1.2" />
        <rect x="309" y="148" width="22" height="14" rx="1.5" fill="#161a22" stroke="currentColor" strokeWidth="1.2" />
        
        {/* Notepad & Pen */}
        <rect x="238" y="160" width="16" height="12" rx="1" fill="#161a22" stroke="currentColor" strokeWidth="1" transform="rotate(-6 238 160)" />
        
        {/* Coffee Mug */}
        <rect x="390" y="157" width="9" height="10" rx="2" fill="#161a22" stroke="currentColor" strokeWidth="1.2" />
        <path d="M399 159 C402 159, 402 165, 399 165" stroke="currentColor" strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}
