import React from 'react';

interface AeroLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  monochrome?: boolean;
}

export default function AeroLogo({
  size = 24,
  monochrome = false,
  className = '',
  ...props
}: AeroLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={monochrome ? 'currentColor' : 'url(#aero-cyan-grad)'}
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="aero-cyan-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      {/* Precision Geometric Vector Wing */}
      <path d="M2 12L22 2L17 22L12 14L2 12Z" strokeWidth="1.65" />
      <path d="M22 2L12 14" strokeWidth="1.65" />
    </svg>
  );
}
