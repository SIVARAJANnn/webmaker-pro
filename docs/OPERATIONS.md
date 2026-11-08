# Webmaker package

Webmaker includes eleven portable agent skills, pinned 3D tooling, a Form 01 product showcase, and a local visual editor.

Studio is optional. Use the installed `/webmaker` skill in your coding assistant to build and edit a website directly. To preview the bundled starter from this folder, run `npm.cmd run dev --prefix templates/product-showcase` and open the address printed in the terminal. The starter also builds independently with `npm.cmd run build --prefix templates/product-showcase`.

If Studio restarts while a tab is open, use **Reconnect Studio** to restore the brief, package selection, or saved project. Copy unsaved editor changes before reconnecting and reselect files that have not been uploaded.

## Start Webmaker Studio

Use Node 22.20 or later. From this folder, run the setup commands once and then start Studio. Open the local address printed in the terminal.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd ci --prefix templates/product-showcase --ignore-scripts
npm.cmd ci --prefix integrations/model-viewer --ignore-scripts
npm.cmd run studio
```

1. Enter your idea and choose a starter. Form 01, Object Study, and Orbit include original CC0 sample models. Upload a self-contained, uncompressed GLB to start with your own model.
2. Review the package recommendations. Type package names or aliases, or choose **Let AI choose**. Click **Build website** to open the live preview.
3. Click **Select Area** and select a section or drag around adjacent blocks. Use the palette and **Content** tab to add or edit blocks. Use **Resize** for numeric adjustments or choose what the corner handle should resize. **Interact** lets you try the site's links and model controls.
4. Use **AI Editor** for scoped changes or **3D Behavior** to describe motion using a `/webmaker-…` alias. **Screenshot** saves a page or area PNG. In the AI Editor, check the attachment box when you want Codex to see the last capture. **Custom Code** stages an isolated component for review before applying it.
5. Click **Export site** for a folder with editable source, a dependency lockfile, and `dist`. Upload the contents of `dist` to a static host. Studio stores local project revisions and screenshots in `.studio`.

The AI tabs use the local Codex CLI login and prefer GPT-6 Astra with GPT-6.1 Sol as the fallback when Astra is unavailable. Run `codex login` if the CLI asks you to sign in. Visual editing and the built-in package recommendations work independently of Codex. Screenshots need Playwright Chromium, Chrome, or Edge. If none is installed, run `npx playwright install chromium`.

Install project skills for an exported project or another workspace using the command below. Choose `codex`, `antigravity`, `claude`, or `cursor`. The installer keeps existing custom skills intact.

```powershell
npm.cmd run skills:install -- --project "D:\path\to\project" --target cursor
```

Run `npm run check:studio` to exercise the guided flow and the export performance budget. Install Playwright Firefox and WebKit to include those browsers in the check. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

| Requested command | What it does | Original source |
| --- | --- | --- |
| `/webmaker` | Plans and builds a complete website: concept, layout, typography, motion, accessibility and visual QA | [juliobsz/skills](https://github.com/juliobsz/skills), adapted from `awwwards` |
| `/webmaker-shadergradient` | Animated 3D gradient backgrounds | [ruucm/shadergradient](https://github.com/ruucm/shadergradient) |
| `/webmaker-liquidlogo` | Liquid metal logo animations | [collidingScopes/liquid-logo](https://github.com/collidingScopes/liquid-logo) |
| `/webmaker-reactthreefiber` | Interactive 3D scenes and model viewers | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) |
| `/webmaker-liquidglassreact` | Refractive glass cards, navigation and controls | [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) |
| `/webmaker-drei` | Load models, add lighting, and provide orbit controls | [pmndrs/drei](https://github.com/pmndrs/drei) |
| `/webmaker-gltf-transform` | Inspect, deduplicate, and report GLB file sizes | [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) |
| `/webmaker-gltfjsx` | Generate React scene components with named parts | [pmndrs/gltfjsx](https://github.com/pmndrs/gltfjsx) |
| `/webmaker-model-viewer` | Embed a standalone interactive model in HTML or Astro | [google/model-viewer](https://github.com/google/model-viewer) |
| `/webmaker-react-postprocessing` | Add selective screen effects in Fiber scenes | [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) |
| `/webmaker-react-three-next` | Adapt a persistent canvas to a Next.js shared layout | [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next) |

The first repository supplies an upstream skill. Webmaker provides integration skills for the libraries, demos, build tools, and architecture reference.

## Use it

On your next turn, invoke a skill with `$webmaker`, `$webmaker-shadergradient`, etc., or write its requested slash name in your prompt. The slash spellings are instruction aliases recognized by these skills; they are not separately registered built-in slash commands. You can combine skills:

```text
/webmaker Build a 3D portfolio for my architecture studio.
Use /webmaker-shadergradient for the hero and /webmaker-liquidglassreact for navigation.
```

```text
$webmaker-reactthreefiber Add a rotating product model to my existing React website.
```

Webmaker takes a brief, chooses a concept and design system, implements the site, then checks the result. It preserves a project's existing framework. The companion skills cover the dependencies, cleanup, and fallbacks for the effects chosen for each site.

## Layout and installed locations

- `skills/`: eleven editable skills with UI metadata, references and attribution.
- `vendor/`: shallow checkouts of the eleven source repositories.
- `node_modules/`: the local toolkit's runtime and QA dependencies.
- `npm-shrinkwrap.json`: exact npm dependency resolution, included in portable archives. These releases may differ from the GitHub checkouts.
- `sources.lock.json`: pinned Git commits for reproducible source restoration.
- `templates/registry.json`: catalog of available starters.
- `integrations/model-viewer/`: isolated dependency profile for the HTML model viewer.
- `plugin.json`: portable skill bundle manifest for future distribution. This is not a published marketplace listing.

The installer links each skill into `%USERPROFILE%\.agents\skills\` on Windows. Changes inside this package's `skills/` are therefore reflected in the installed skills without copying. Keep this package in place. Other website projects still install their own required npm dependencies.

## Maintain the package

Run from this directory with Node 22.20 or later:

```powershell
npm ci --ignore-scripts
npm run skills:install
npm run check
npm run check:types
npm run sources:status
```

To run or test the product showcase, use its separate lockfile.

```powershell
npm ci --prefix templates/product-showcase --ignore-scripts
npm run dev --prefix templates/product-showcase
```

Run `npm run check:browser` from the package root to build the showcase and check its 3D viewer, mobile layout, keyboard controls, accessibility and WebGL fallback. It uses installed Chrome, Edge or Playwright Chromium. If none is available, run `npx playwright install chromium`.

To prepare a model, run `npm run model:prepare -- input.glb output.glb`. This inspects both files, keeps the original and existing outputs intact, and deduplicates geometry and texture data without merging named meshes or materials. Use the glTF Transform skill for asset-specific compression, and verify the visual result before replacing the original.

`skills:install` is repeatable and refuses to overwrite any unrelated skill. To choose another destination, use `npm run skills:install -- --dest 'C:\path\to\skills'`.

On another machine or after unpacking the portable archive, run `npm run sources:restore` to download the exact GitHub source revisions. It leaves existing checkouts untouched and reports local modifications or revision differences. Network access is required. Do not replace local work with an upstream update without reviewing the diff. Update source locks, copied assets, licenses, compatibility notes and validation together when intentionally upgrading.

## Add a website template

Give Codex the template/repository URL and say:

```text
Add this template to my webmaker-package, preserve its license, and make /webmaker able to use it.
```

For a manual addition, put its files in `templates/<template-id>/` and append an entry to `templates/registry.json`:

```json
{
  "id": "studio-3d",
  "name": "Studio 3D",
  "source": "https://github.com/OWNER/REPOSITORY",
  "license": "MIT",
  "framework": "React",
  "skills": ["webmaker", "webmaker-reactthreefiber"]
}
```

Record the real source, revision and asset licenses for that template. Add its manifest, lockfile and source paths to the archive allowlist in `package.json`. Exclude its installed dependencies and build output. For another effect skill, add its folder under `skills/`, register it in `catalog.json` and `sources.lock.json`, and run validation and the installer.

## Dependency profiles and tradeoffs

- Drei and React Postprocessing share the toolkit's React 19, Fiber 9 and Three 0.187 stack. Install only the packages the target site actually uses.
- Model Viewer 4.4.0 uses the Three 0.183 peer range. Run `npm ci --prefix integrations/model-viewer --ignore-scripts` to restore that separate profile. Avoid forcing incompatible peers into the same app.
- glTF Transform and gltfjsx are development tools. Keep them out of browser bundles. The root manifest pins patched glob, sharp, and glTF Transform versions for the affected CLI dependencies. Use the root installation for gltfjsx so those overrides apply.
- React Three Next is an architecture reference. Its source manifest uses Next 14, React 18 and Fiber 8. Bring the shared canvas pattern into a supported target stack.
- The showcase loads its Three.js code and model only when requested. Larger models, textures, and postprocessing still require measurement on the target phone. Test each new template with realistic assets.
- Liquid Glass displacement varies by browser. Keep a readable CSS surface and check Safari and Firefox on sites that use the effect.

`check` validates the bundle, references, source metadata and template catalog. `check:types` verifies library types. The browser check covers the stock product showcase on Chromium. For other effects and devices, run the site QA workflow against the customized production build.

The upstream Webmaker scripts provide screenshot and audit helpers. Run them from the website project after installing its QA dependencies. This toolkit installs Playwright, which can use cached Chromium or local Chrome/Edge through the upstream browser helper; a new Chromium download is not required merely to install the skills.

For portable sharing, `npm pack --ignore-scripts` creates an archive containing skills, source snippets, metadata and maintenance scripts. Full `vendor/` checkouts and `node_modules/` are intentionally restored separately using the lock files. The package is private to prevent accidental npm publication.
