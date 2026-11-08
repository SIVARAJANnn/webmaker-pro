import React, { useEffect, useState } from 'react'
import LiquidGlass from 'liquid-glass-react'

export default function GlassSurface() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!query.matches && CSS.supports('backdrop-filter', 'blur(1px)'))
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  if (!enabled) return null
  return <div className="glass-engine" aria-hidden="true"><LiquidGlass mode="standard" displacementScale={18}
    elasticity={0} padding="0" cornerRadius={8}
    style={{ position: 'absolute', width: '100%', height: '100%', top: '50%', left: '50%' }} /></div>
}
