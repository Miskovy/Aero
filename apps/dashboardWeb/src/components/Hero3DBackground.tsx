'use client';

import React from 'react';
import ArtisticMountainCanvas from './ArtisticMountainCanvas';

export default function Hero3DBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <ArtisticMountainCanvas intensity={1.1} showConstellations={true} />

      {/* Atmospheric vignette mask for seamless blend */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(11, 13, 16, 0.2) 0%, rgba(11, 13, 16, 0.75) 80%, rgba(11, 13, 16, 0.95) 100%)',
        }}
      />
    </div>
  );
}
