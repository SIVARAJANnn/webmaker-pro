import React from 'react'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
export default function AmbientShader() {
  return <div className="ambient" aria-hidden="true">
    <ShaderGradientCanvas pixelDensity={1} style={{ position: 'absolute', inset: 0 }}>
      <ShaderGradient control="props" type="plane" lightType="3d" animate="on" uSpeed={.16} color1="#466986" color2="#c19369" color3="#1e2938" />
    </ShaderGradientCanvas>
  </div>
}
