---
name: webmaker-gltf-transform
description: Inspect and optimize glTF and GLB assets for websites with glTF Transform. Use for /webmaker-gltf-transform, model size reduction, texture budgets, or preparing an asset for Webmaker.
---

# /webmaker-gltf-transform

Use [glTF Transform](https://github.com/donmccurdy/glTF-Transform) as a build tool. The toolkit includes `@gltf-transform/cli@4.5.1` as a development dependency.

From the Webmaker package directory, run:

```text
npm run model:prepare -- path/to/input.glb path/to/output.glb
```

The command preserves the input, inspects both files, and reports the size difference. Inspect the model before choosing more aggressive compression. Keep node names, skins, animations, material boundaries and extension support that the site relies on. Check the rendered result at realistic camera distances and confirm the target loader can decode the output. Record the model's source and license separately from the tool's license.
