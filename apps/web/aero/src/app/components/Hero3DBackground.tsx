'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function WavyTerrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create a plane geometry
  // Width, Height, WidthSegments, HeightSegments
  const geometry = useMemo(() => new THREE.PlaneGeometry(30, 15, 60, 30), [])
  const positions = geometry.attributes.position

  // Store the initial Z positions so we can animate them
  const initialZ = useMemo(() => {
    const zArray = new Float32Array(positions.count)
    for (let i = 0; i < positions.count; i++) {
      zArray[i] = positions.getZ(i)
    }
    return zArray
  }, [positions])

  const timeRef = useRef(0)

  useFrame((state, delta) => {
    if (!meshRef.current) return

    timeRef.current += delta * 0.12 // Accumulate delta instead of using state.clock
    const time = timeRef.current
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)

      const waveX = Math.sin(x * 0.4 + time) * 0.6
      const waveY = Math.sin(y * 0.4 + time * 0.8) * 0.6
      const waveXY = Math.sin((x + y) * 0.2 - time) * 0.5

      posAttr.setZ(i, initialZ[i] + waveX + waveY + waveXY)
    }

    posAttr.needsUpdate = true
    meshRef.current.rotation.z = time * 0.03
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, -5]}>
      {/* Very soft, semi-transparent teal wireframe so it doesn't fight the text */}
      <meshBasicMaterial
        color="#38bdf8"
        wireframe={true}
        transparent={true}
        opacity={0.12}
        fog={true}
      />
    </mesh>
  )
}

export default function Hero3DBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        {/* Soft fog to fade out edges */}
        <fog attach="fog" args={['#000000', 5, 18]} />
        <WavyTerrain />
      </Canvas>

      {/* Strong radial gradient mask to protect text legibility:
          Darkens the grid heavily in the top-center where the headline sits,
          letting the grid show more toward the bottom and sides. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 30%, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.75) 45%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 15%, rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 1) 100%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
