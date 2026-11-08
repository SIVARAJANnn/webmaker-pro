---
name: webmaker-reactthreefiber
description: Build interactive 3D scenes in React websites using Three.js and @react-three/fiber. Use for /webmaker-reactthreefiber, 3D product viewers, model scenes, or interactive 3D website sections; pair with Webmaker for the surrounding site.
---

# /webmaker-reactthreefiber

Use [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber), the React renderer for Three.js.
Read [references/integration.md](references/integration.md) for setup and the scene pattern.

- Inspect the existing React major and package manager. R3F 8 pairs with React 18; R3F 9 pairs with React 19. Check the exact published peer ranges before installation. Reuse an existing compatible Three.js installation.
- Put `Canvas` in a container with explicit dimensions. Keep `useFrame`, `useThree`, and scene hooks inside components rendered under that canvas. In an SSR framework, mount the scene through a client boundary.
- Keep high-frequency animation in refs and `useFrame` with delta time. Avoid React setState per frame. Choose one renderer per canvas; GSAP may animate shared values without driving a competing render loop.
- For static or input-driven scenes, consider `frameloop="demand"` and invalidate when values change. Animated scenes need a suitable loop. Clamp pixel ratio and lazy-load expensive models.
- Keep navigation and readable content in HTML. Provide an image or HTML fallback for missing WebGL and reduced motion. Give essential pointer interactions an accessible DOM control.
- Dispose manually owned resources and remove subscriptions on unmount. Reuse geometry, materials and textures where practical; do not repeatedly recreate GPU resources during animation.
- Verify actual rendering and interaction, console errors, responsive sizing, reduced motion, and the production build. Type checking alone does not establish visual correctness.

Install optional Drei, loaders, postprocessing or physics only when the task needs them. Use current official docs at https://r3f.docs.pmnd.rs/ for APIs not covered by the bundled reference.
