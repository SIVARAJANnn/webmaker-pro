# Liquid Logo source map

The complete original checkout lives in the toolkit's `vendor/liquid-logo/`. The portable skill carries these core source files under `assets/source/`:

| File | Role |
| --- | --- |
| `vertex-shader.glsl` | Fullscreen geometry projection |
| `fragment-shader.glsl` | Liquid pattern and logo texture composition |
| `shaders.js` | Fetch, compile and link helpers |
| `main.js` | Reference texture setup, uniforms and render loop; depends on original page DOM |
| `gui-controls.js` | Original parameter defaults and GUI wiring |
| `presets.js` | Preset parameter values |
| `LICENSE.txt` | MIT attribution for copied source |

The original demo must be served over HTTP because it fetches shaders. For local inspection, serve the full checkout with a static server; opening `index.html` via `file://` is insufficient. Its HTML also references public CDNs and analytics. A local clone is not an offline, private variant of the hosted tool.

For a production component:

1. Load GLSL through the framework's supported raw imports or fetch it from an explicit public asset URL. The original helper's relative filenames resolve against the document URL, which fails on nested routes unless adapted.
2. Create the canvas only on the client, check for a valid WebGL context, and stop initialization on failure. Use CSS/container dimensions with a capped pixel ratio.
3. Compile/link and surface errors. Use the supplied quad and uniforms. `u_resolution`, `u_time`, `u_speed`, `u_iterations`, `u_logoTexture`, `u_logoAspectRatio`, `u_logoScale`, `u_logoOpacity` and `u_logoBlendMode` have distinct types; the blend mode uses an integer uniform.
4. Adapt `resizeAndCreateLogoTexture`: preserve the original aspect ratio, center in a square transparent texture, use clamp-to-edge and linear filtering, and release replaced textures. Same-origin or CORS-enabled images are needed for a usable canvas texture/export.
5. Advance time only while animation is enabled. Design the static first frame, resizing and cleanup as part of the wrapper. Do not copy document-level keyboard shortcuts into unrelated form fields.

For a React implementation using R3F, translate the uniforms and shader into a compatible shader material and let the canvas own the loop. For a plain HTML site, encapsulate the globals in a component-like setup/dispose function. Do not install a guessed package named `liquid-logo`.
