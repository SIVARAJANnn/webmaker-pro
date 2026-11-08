import React from 'react'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
export default function SceneBloom() {
  return <EffectComposer multisampling={0}><Bloom intensity={.35} luminanceThreshold={.7} /></EffectComposer>
}
