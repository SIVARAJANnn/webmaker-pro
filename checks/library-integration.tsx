// Compile-only compatibility check. This is not a visually tested website template.
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import LiquidGlass from 'liquid-glass-react'
import type { Mesh } from 'three'

function Shape() {
  const mesh = useRef<Mesh>(null)
  useFrame((_, delta) => { if (mesh.current) mesh.current.rotation.y += delta * 0.2 })
  return <mesh ref={mesh}><boxGeometry /><meshStandardMaterial color="#bb8d56" /></mesh>
}

export function LibraryIntegration() {
  return <>
    <div style={{ position: 'relative', height: 240 }}>
      <ShaderGradientCanvas pixelDensity={1.5} style={{ position: 'absolute', inset: 0 }}>
        <ShaderGradient control="props" type="plane" animate="off" color1="#447799" color2="#8b658b" color3="#e7c9a5" />
      </ShaderGradientCanvas>
    </div>
    <div style={{ height: 240 }}>
      <Canvas dpr={[1, 1.5]}>
        <ambientLight /><Shape /><OrbitControls />
        <EffectComposer><Bloom intensity={0.3} /></EffectComposer>
      </Canvas>
    </div>
    <div style={{ position: 'relative', height: 240 }}>
      <LiquidGlass mode="standard" elasticity={0} cornerRadius={24} padding="24px"
        style={{ position: 'absolute', left: '50%', top: '50%' }}>
        <a href="#content">View content</a>
      </LiquidGlass>
    </div>
  </>
}
