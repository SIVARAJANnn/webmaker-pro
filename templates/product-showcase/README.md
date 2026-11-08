# Form 01 product showcase

This standalone Vite and React template includes a static poster and an optional interactive 3D viewer. The model loads when a visitor chooses Explore in 3D. It uses demand rendering and does not rotate by itself.

```text
npm ci --ignore-scripts
npm run dev
npm run build
```

Edit the name, descriptions, and finishes in `src/main.jsx`. Replace `assets/form-01.glb` with your model and replace the poster in the same file. For color switching, name the body material `Finish`, or adapt the material lookup in `src/scene.jsx`. Adjust the camera and controls for the replacement model's scale.

The included Form 01 GLB was generated from `scripts/generate-model.mjs` and prepared with the toolkit's `model:prepare` command. Its geometry, materials, and SVG poster were created for this template. The template and included assets are supplied under CC0-1.0. Fieldwork Audio is fictional sample branding.
