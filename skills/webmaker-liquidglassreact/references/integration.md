# Liquid Glass React integration

Repository: https://github.com/rdev/liquid-glass-react
Install in the target project: `npm install liquid-glass-react` (or the existing package manager). Inspect published peers first; do not use `--legacy-peer-deps` to hide a mismatch.

```tsx
'use client'
import LiquidGlass from 'liquid-glass-react'

export function GlassPanel() {
  return <div style={{ position: 'relative', minHeight: 220 }}>
    <LiquidGlass mode="standard" displacementScale={40} blurAmount={0.1}
      saturation={120} aberrationIntensity={1} elasticity={0}
      cornerRadius={24} padding="24px"
      style={{ position: 'absolute', left: '50%', top: '50%' }}>
      <h2>Project details</h2>
      <a href="/work">Explore the work</a>
    </LiquidGlass>
  </div>
}
```

Size the surrounding region for the content and ensure the text fits on narrow screens. `elasticity={0}` removes elastic interaction. The surface should have an explicit fallback background if refraction is unsupported.

`mouseContainer` accepts a ref to a larger HTML element. Other useful props are `overLight`, `globalMousePos`, `mouseOffset`, `style` and `className`. Modes are `standard`, `polar`, `prominent` and `shader`. Some internals use utility class names: verify positioning and styles in a project without Tailwind and add equivalent scoped CSS where necessary; do not require a framework migration merely to render this effect.
