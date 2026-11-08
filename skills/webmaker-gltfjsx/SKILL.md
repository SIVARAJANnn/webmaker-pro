---
name: webmaker-gltfjsx
description: Generate editable React Three Fiber components from glTF or GLB models with gltfjsx. Use for /webmaker-gltfjsx, per-part animation, or product material configurators.
---

# /webmaker-gltfjsx

Use the pinned [gltfjsx](https://github.com/pmndrs/gltfjsx) CLI from the Webmaker package directory. Its dependency lock and overrides apply patched versions of the underlying image and model tools. Pass paths to the target project when generating its component:

```text
npm exec -- gltfjsx public/product.glb --types --keepnames --output src/Product.tsx
```

- Use this when the site needs JSX access to individual meshes. For a whole-model preview, a direct `useGLTF` scene is simpler.
- Keep the original GLB. Prefer one optimization step. The optional `--transform` already runs a model transformation and may change mesh structure or require a decoder.
- Review the generated URL, imports and types. Generated components use Drei's `useGLTF` and run under a Fiber canvas. Copy the asset to the actual public path used by the generated component.
- Keep semantic controls in HTML and verify that the expected nodes still exist after export or optimization. Preserve the model's attribution.
