---
name: webmaker-react-three-next
description: Adapt persistent React Three Fiber canvases to Next.js App Router websites using react-three-next as an architecture reference. Use for /webmaker-react-three-next or route transitions that must preserve a 3D scene.
---

# /webmaker-react-three-next

Use the [React Three Next](https://github.com/pmndrs/react-three-next) source for its shared canvas and DOM view patterns. Its upstream manifest targets Next 14, React 18 and Fiber 8. Start from the target project's supported Next/React versions and choose the matching Fiber major. This repository is a starter, so there is no separate runtime package to install.

- Place a client canvas provider in the nearest shared layout that should preserve scene state across routes. Keep semantic content and navigation in normal server-rendered page markup where practical.
- Load browser-only render code behind a client boundary. Use a static poster while it loads and if initialization fails. Use Drei View or an equivalent scoped viewport only when several DOM regions genuinely share the canvas.
- Verify navigation, back/forward, focus, scroll restoration, and disposal of route-specific assets. Keep a single owner of the render loop.
- For a single product page, the Webmaker product showcase is a smaller example of the renderer and fallback. Use this skill when the target actually needs Next routing and a persistent scene.
