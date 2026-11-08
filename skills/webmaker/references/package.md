# Webmaker toolkit

This package combines the adapted `awwwards` workflow with companion skills. Read the selected companion's `SKILL.md` for compatibility and integration details.

| Need | Skill | Implementation |
| --- | --- | --- |
| Complete site and design direction | `$webmaker` | This workflow and its original references/helpers |
| Moving 3D color background | `$webmaker-shadergradient` | `@shadergradient/react` |
| Liquid metal logo | `$webmaker-liquidlogo` | Adapted vanilla WebGL source; no official npm component |
| Interactive 3D model/scene | `$webmaker-reactthreefiber` | `three` and `@react-three/fiber` |
| Refractive UI surface | `$webmaker-liquidglassreact` | `liquid-glass-react` |
| GLB loading, orbit controls or lighting | `$webmaker-drei` | `@react-three/drei` in Fiber 9 |
| Inspect and prepare a 3D asset | `$webmaker-gltf-transform` | Local model preparation command |
| Generate a component with accessible mesh parts | `$webmaker-gltfjsx` | Local JSX generation CLI |
| Standalone HTML model embed | `$webmaker-model-viewer` | `@google/model-viewer` with its isolated Three dependency |
| Selective scene effects | `$webmaker-react-postprocessing` | `@react-three/postprocessing` in Fiber |
| Persistent canvas between Next.js routes | `$webmaker-react-three-next` | Architecture reference with a legacy upstream dependency stack |

React-based companions work naturally in React/Next.js or a compatible React island. Respect existing projects; do not migrate an unrelated framework merely to add an effect. Prefer the lightest combination that expresses the brief. Do not import all installed libraries by default.

The installed skills may be directory links. Resolve the real skill directory first; the package root is two parents above `skills/webmaker`. The package contains `catalog.json`, `sources.lock.json`, `npm-shrinkwrap.json`, `templates/registry.json` and complete source checkouts under `vendor/`. If running a standalone copied skill without this package, skip the package catalog and use the available self-contained references.

For a template-based request, read the registry, choose the user-specified template or a fitting installed entry, and inspect its instructions, dependencies and license before adapting it. An empty registry means no website templates have been added yet; the effect libraries are not complete website templates. Preserve its pages and behavior except where the requested design changes require edits.

The `product-showcase` template is a standalone React/Vite project with an original GLB and a static poster. Copy it into the target project before customizing, run its documented install/build commands, and keep the supplied model provenance if reusing the asset. The package's `check:browser` validates the stock starter; run the site QA workflow for a customized production build.

When the user supplies another template or effect repository, inspect the source and license, capture a revision, put templates under `templates/<id>/`, and register them. Create a new named skill only when it adds a reusable workflow; adding a template alone does not require another skill. Update the package README and run its checks after changes. Never reset a modified source checkout to update it.

The npm lockfile records tested published packages; source revisions can be newer than npm. Install required dependencies into each target website using its own package manager. Do not depend on an absolute import into this toolkit's node_modules. Match React and R3F major versions and inspect exact peer ranges before changing dependencies.

Use each renderer's own lifecycle. GSAP can drive DOM motion and shared uniforms while R3F or ShaderGradient renders its canvas. Avoid conflicting loops, scrolling systems, and transform owners. Static content, keyboard access, reduced motion and mobile performance remain part of the site design.
