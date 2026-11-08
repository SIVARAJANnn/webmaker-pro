---
name: webmaker-drei
description: Add Drei helpers to React Three Fiber websites for loading glTF, camera controls, lighting, and performance. Use for /webmaker-drei or an existing R3F scene that needs reusable scene components.
---

# /webmaker-drei

Use [Drei](https://github.com/pmndrs/drei) inside a React Three Fiber scene.
The toolkit pins `@react-three/drei@10.7.9` for React 19 and Fiber 9. Check the target site's peer ranges before installing.

- Add only the helpers the scene needs. Use `useGLTF` for a local model, `OrbitControls` for deliberate user interaction, and `Bounds` or explicit camera settings to frame the object.
- Keep loader and model components within the canvas. Put a poster and accessible HTML instructions outside the canvas. Handle model and GPU failures with a visible fallback.
- If the asset requires Draco, Meshopt, or KTX2, verify decoder support and host any decoder files required by the site's network policy. Test with external network requests blocked when offline operation is needed.
- Start with local lights. If you use an environment map, use an attributed local file and check its size. Prefer demand rendering for a viewer that only moves in response to user input.
- Use the product showcase template for a runnable example. Check load errors, framing at mobile widths, and the no-WebGL fallback.
