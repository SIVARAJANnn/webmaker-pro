---
name: webmaker-liquidglassreact
description: Add refractive liquid glass surfaces to React website cards, navigation, and controls with liquid-glass-react. Use for /webmaker-liquidglassreact or an explicit Apple-style liquid glass effect, including responsive and accessible fallbacks.
---

# /webmaker-liquidglassreact

Integrate [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react).
Read [references/integration.md](references/integration.md) before composing surfaces.

- Use the published `liquid-glass-react` default export. Check its installed peer dependencies: the published 1.1.1 package requires React 19 even though the repository package.json at the captured commit says >=18.
- Keep the component in a client boundary for SSR frameworks. Place it against real visual detail so refraction is visible, and preserve readable contrast on every background state.
- Start with `mode="standard"`. Tune displacement, blur, saturation, aberration, elasticity, corner radius and padding to the design. `shader` mode has additional stability and performance tradeoffs.
- Inspect positioning: this implementation includes centered translate transforms. Use a positioned wrapper and verify layout rather than treating it as a normal flow card. Do not let GSAP and the component overwrite the same transform.
- Use semantic buttons and links for actions. Its `onClick` surface is a div; passing that prop alone does not provide keyboard button semantics.
- Safari and Firefox have partial support and may lack displacement. Provide a translucent CSS/background-blur fallback, preserve legibility, and remove elastic motion for reduced motion.
- Check the actual browser result, keyboard focus, touch layout, resizing, and the production build. Record browser limitations instead of promising identical refraction everywhere.
