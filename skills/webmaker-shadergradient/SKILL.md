---
name: webmaker-shadergradient
description: Add or tune animated ShaderGradient backgrounds in React websites using @shadergradient/react. Use for /webmaker-shadergradient, shader gradient heroes, or a supplied shadergradient.co preset. Supports the Webmaker toolkit; use React Three Fiber for general 3D scenes.
---

# /webmaker-shadergradient

Integrate the renderer from [ruucm/shadergradient](https://github.com/ruucm/shadergradient).
Read [references/integration.md](references/integration.md) for the API and compatibility notes.

- Inspect the target project's React version, package manager, and lockfile first. Install the renderer and matching peers in that project; the toolkit's node_modules is not inherited by other projects.
- Compose `ShaderGradient` inside `ShaderGradientCanvas`. Give its parent an explicit height and positioning context. Use `control="props"` for authored settings or `control="query"` with the user's preset URL.
- Keep headings, links, and other meaningful content in HTML above the decorative canvas. Add a scrim when contrast needs it and prevent the canvas from swallowing pointer input.
- Mount behind a client boundary in an SSR app; load browser-only code there. Preserve a CSS gradient as the initial, reduced-motion, and unavailable-WebGL fallback.
- Cap pixel density, pause or unmount when offscreen, and avoid running several full-screen canvases. Use the renderer's loop; do not add a second render loop for the same canvas.
- Verify the production build, phone layout, fallback, and live animation. Report what was actually checked.

If the installed package differs from the bundled reference snapshot, inspect its exports and types before using newer props. Keep automatic selection enabled; a full website request can combine this with `$webmaker`.
