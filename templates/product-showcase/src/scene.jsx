import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

const assetUrl = new URL('../assets/form-01.glb', import.meta.url).href

function Product({ color, onReady }) {
  const { scene } = useGLTF(assetUrl, false, false)
  const instance = useMemo(() => {
    const model = scene.clone(true)
    const shells = []
    model.traverse(node => {
      if (node.isMesh && node.material.name === 'Finish') {
        node.material = node.material.clone()
        shells.push(node.material)
      }
    })
    return { model, shells }
  }, [scene])
  useEffect(() => () => {
    instance.shells.forEach(material => material.dispose())
  }, [instance])
  useEffect(() => { onReady(true) }, [onReady])
  instance.shells.forEach(material => material.color.set(color))
  return <primitive object={instance.model}/>
}

export default function Scene({ color, fallback }) {
  const [ready, setReady] = useState(false)
  return <div className={ready ? 'scene ready' : 'scene'} data-model-ready={ready}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [3.4, 2.1, 5.4], fov: 38 }}
      fallback={fallback}>
      <ambientLight intensity={1.5}/>
      <directionalLight color="#fff4de" position={[4, 6, 5]} intensity={3}/>
      <directionalLight color="#a8c5ff" position={[-4, 2, -5]} intensity={1.8}/>
      <Suspense fallback={null}><Product color={color} onReady={setReady}/></Suspense>
      <OrbitControls enableDamping={false} enablePan={false} minDistance={4} maxDistance={9}/>
    </Canvas>
  </div>
}
