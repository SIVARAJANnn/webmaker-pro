# React Three Fiber integration

Repository: https://github.com/pmndrs/react-three-fiber
Runtime packages for React 19: `react`, `react-dom`, `three`, `@react-three/fiber@9`.
TypeScript projects also need compatible `@types/react`, `@types/react-dom`, `@types/three`.
Check exact peer ranges: the pinned published R3F 9.8.2 supports React >=19 and <19.4.

```tsx
'use client'
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

function Object3D() {
  const mesh = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += Math.min(delta, 0.1) * 0.3
  })
  return <mesh ref={mesh}>
    <torusKnotGeometry args={[0.7, 0.2, 96, 16]} />
    <meshStandardMaterial color="#bb8d56" metalness={0.65} roughness={0.25} />
  </mesh>
}

export function Scene() {
  return <div style={{ height: 420 }}>
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4] }} fallback={<p>3D preview unavailable.</p>}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={3} />
      <Object3D />
    </Canvas>
  </div>
}
```

The caller switches to a static illustration when reduced motion is requested. Add an error boundary for loading or context errors and appropriate Suspense boundaries for asynchronous models. Do not use the scene's pixels as the only product description or control surface.
