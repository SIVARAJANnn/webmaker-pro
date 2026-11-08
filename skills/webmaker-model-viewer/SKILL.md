---
name: webmaker-model-viewer
description: Embed a GLB in a plain HTML or Astro website using Google's model-viewer web component. Use for /webmaker-model-viewer, a standalone product viewer, or device-supported AR previews.
---

# /webmaker-model-viewer

Use [Model Viewer](https://github.com/google/model-viewer) for standalone interactive GLB previews. Use the toolkit's isolated `integrations/model-viewer` dependency profile as a starting point. `@google/model-viewer@4.4.0` requires Three `^0.183.0`, which differs from the main toolkit's Three `0.187.0`.

```html
<model-viewer src="/product.glb" poster="/product.webp"
  alt="Front and sides of the product" camera-controls loading="lazy">
</model-viewer>
```

Import `@google/model-viewer` in a browser module, size the element explicitly, and keep the poster and product details usable before JS loads. Turn on AR only for a request that needs it and test it on a supported device. Verify fallback and touch controls. Keep this dependency profile separate from the main Fiber project unless both peer ranges have been checked.
