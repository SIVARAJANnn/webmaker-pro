---
name: webmaker-react-postprocessing
description: Add selective bloom, tone mapping, or depth of field to React Three Fiber scenes with react-postprocessing. Use for /webmaker-react-postprocessing or an R3F scene that needs an explicit screen effect.
---

# /webmaker-react-postprocessing

Use [React Postprocessing](https://github.com/pmndrs/react-postprocessing) in a Fiber canvas. The toolkit uses `@react-three/postprocessing@3.2.2`; verify its Fiber, Three and `postprocessing` peer versions in the target project.

- Put one `EffectComposer` in the scene and add only the passes needed for the visual result. Start by tuning materials and lighting, then apply bloom or another effect selectively.
- Control pixel ratio, multisampling and effect resolution where supported. Compare the scene with and without the composer at the target phone size. Lower quality or omit expensive passes when frame time degrades.
- Keep text, navigation, and controls in the DOM. Verify color, contrast, mobile rendering and the static fallback. A still screenshot cannot establish smooth motion.
