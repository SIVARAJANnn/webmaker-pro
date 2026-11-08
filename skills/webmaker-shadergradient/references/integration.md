# ShaderGradient integration

Repository: https://github.com/ruucm/shadergradient
Published renderer: `@shadergradient/react`. The old `shadergradient` package and the separate controls UI are different products.

For a React 19 app, install `@shadergradient/react`, `@react-three/fiber@9`, `three`, `three-stdlib`, and `camera-controls`, plus `@types/three` for TypeScript. Verify the installed renderer's peer dependencies. R3F 8 pairs with React 18; R3F 9 pairs with React 19. Do not force mismatched peers. The upstream documentation specifically requires React 19/R3F 9 for Next 15 App Router.

```tsx
'use client'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

export function GradientLayer() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1.5}>
        <ShaderGradient control="props" type="plane" animate="on"
          color1="#447799" color2="#8b658b" color3="#e7c9a5"
          uSpeed={0.25} uStrength={2} cDistance={3.6} />
      </ShaderGradientCanvas>
    </div>
  )
}
```

The caller provides a positioned, sized container and decides whether motion/WebGL is available before mounting this layer. For reduced motion, use the static fallback or the supported `animate="off"` setting; stopping motion alone may not stop all rendering work.

Useful controls: `type` (`plane`, `sphere`, `waterPlane`), three colors, `uSpeed`, `uStrength`, `uFrequency`, `uDensity`, `cDistance`, `cAzimuthAngle`, `cPolarAngle`, `brightness`, `grain`. Settings from the customizer use `control="query"` and `urlString`. Newer checkout APIs may exceed the published release: check installed types for lazy-loading and environment props.
