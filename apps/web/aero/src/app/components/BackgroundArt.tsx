export default function BackgroundArt() {
  return (
    <>
      {/* Base: Pure Black for ultimate contrast and boldness */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -3, backgroundColor: '#000000', pointerEvents: 'none' }} />
      
      {/* Layer 1: Deep Aurora (Slow moving cyan/violet gradients) */}
      <div className="bg-aurora" />
      
      {/* Layer 2: Fading Dot Matrix */}
      <div className="bg-matrix" />

      {/* Layer 3: Cinematic Film Grain Overlay */}
      <div className="bg-noise" />
    </>
  )
}
