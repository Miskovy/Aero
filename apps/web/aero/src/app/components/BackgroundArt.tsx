export default function BackgroundArt() {
  return (
    <>
      {/* Base: Van Gogh Midnight Obsidian */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -10,
          backgroundColor: '#080b12',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 1: Ambient Van Gogh Celestial Indigo/Cyan Glow */}
      <div className="vg-ambient-glow" />

      {/* Layer 2: Subtle Classical Canvas Weave Dot Matrix */}
      <div className="vg-weave" />

      {/* Layer 3: Painterly Impasto Noise Texture Overlay */}
      <div className="vg-grain" />
    </>
  );
}
