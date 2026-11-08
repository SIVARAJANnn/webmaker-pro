---
name: webmaker-liquidlogo
description: Create liquid metal logo animations for websites using the WebGL shaders and source patterns from collidingScopes/liquid-logo. Use for /webmaker-liquidlogo, animated metallic branding, or adapting that logo tool into a website.
---

# /webmaker-liquidlogo

Use the source from [collidingScopes/liquid-logo](https://github.com/collidingScopes/liquid-logo).
This is a standalone HTML/JavaScript/WebGL app, not an npm library or ready-made React component.
Read [references/integration.md](references/integration.md) for its source map and adaptation requirements.

- Use the user's logo. Prefer clean edges and a transparent image. Keep its aspect ratio and a static image fallback; do not treat upstream demo brands as the user's assets.
- For shader integration, copy the needed files from `assets/source/` into the target project and adapt them there. Preserve the accompanying MIT license. The bundled snapshot is a source reference, not a drop-in component.
- Build a lifecycle wrapper around the shader, texture and canvas. The original main.js uses global DOM IDs and starts immediately, so importing it unchanged into React will not work reliably.
- Use either R3F's loop or a standalone render loop owned by this effect. Pause offscreen and under reduced motion; dispose textures, programs, shaders and buffers, remove listeners, and cancel the frame callback on unmount.
- Retain a recognizable, legible logo in the first frame. Show the static version if shader loading or WebGL initialization fails.
- The original tool has upload, GUI, recording, analytics and demo branding. Include only requested features in an adaptation. The bundled core source omits the upstream HTML analytics tag.
- Test the real shader, logo aspect ratio, resize behavior, cleanup, static fallback and phone performance. For export features, inspect upstream `canvasVideoExport.js` and its muxer dependency before implementing them.
