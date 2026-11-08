# Installation

## Before you start

Install Git and Node.js **22.20+** with npm. Use a coding assistant that can read local Markdown skills. The installer supports target folders for Cursor, Claude, Codex and Antigravity; discovery depends on your editor version. All commands below run from the repository root. On Windows PowerShell use `npm.cmd` if execution policy blocks `npm`.

## Step 1 — Install the skills in your favorite editor

```sh
git clone https://github.com/SIVARAJANnn/webmaker-pro.git
cd webmaker-pro
node scripts/install-skills.mjs --project . --target cursor
```

Choose the target matching your assistant:

| Assistant | Command |
| --- | --- |
| Cursor | `node scripts/install-skills.mjs --project . --target cursor` |
| Claude | `node scripts/install-skills.mjs --project . --target claude` |
| Codex | `node scripts/install-skills.mjs --project . --target codex` |
| Antigravity | `node scripts/install-skills.mjs --project . --target antigravity` |

This installs all 11 skills before any npm installation. It copies them into `.agents/skills/`, or `.claude/skills/` for Claude. It refuses to overwrite unrelated existing skills.

To install into another existing website, replace `.` with its directory, such as `"../my-website"`. Open that website in your editor and start a fresh assistant conversation. If automatic discovery is unavailable, ask the assistant to read `.agents/skills/webmaker/SKILL.md` (or the equivalent `.claude` path).

Optional user-wide installation: `node scripts/install-skills.mjs` creates links in your home directory's `.agents/skills/`. Keep this repository in place because the links point here. Project installation uses copies.

## Step 2 — Prepare all subpackages with one prompt

Paste this into your assistant with **webmaker-pro open as the workspace**:

```text
Prepare this Webmaker Pro checkout for all 11 skills.

1. Read README.md, catalog.json, package.json and all eleven skills/*/SKILL.md files.
2. Confirm Node >=22.20, npm and Git are available.
3. Run npm ci --ignore-scripts in the repository root.
4. Run npm ci --prefix templates/product-showcase --ignore-scripts.
5. Run npm ci --prefix integrations/model-viewer --ignore-scripts.
6. Run npm run sources:restore to restore the pinned upstream sources.
   Preserve existing checkouts and local modifications; report mismatches.
7. Run npm run check, npm run check:types and npm run sources:status.
8. Report readiness for:
   /webmaker
   /webmaker-shadergradient
   /webmaker-liquidlogo
   /webmaker-reactthreefiber
   /webmaker-liquidglassreact
   /webmaker-drei
   /webmaker-gltf-transform
   /webmaker-gltfjsx
   /webmaker-model-viewer
   /webmaker-react-postprocessing
   /webmaker-react-three-next
9. Explain which entries are libraries, build tools, source integrations or
   architecture references. Do not npm-install the slash aliases.
10. Show how to launch Studio and the standalone starter.
    Resolve setup issues where possible and report failed checks accurately.

Use npm.cmd on Windows PowerShell if needed.
For a separate website, inspect its framework and peer dependencies; install only
the runtime libraries it uses. Keep Model Viewer in its separate profile and
model-processing tools out of browser bundles.
```

Manual equivalent:

```sh
npm ci --ignore-scripts
npm ci --prefix templates/product-showcase --ignore-scripts
npm ci --prefix integrations/model-viewer --ignore-scripts
npm run sources:restore
npm run check
npm run check:types
npm run sources:status
```

Network access is required. The toolkit, starter and Model Viewer each have pinned dependency resolution. The isolated Model Viewer profile avoids incompatible Three.js peers.

## Build your first website

```text
/webmaker Build a premium 3D product landing page using the bundled Form 01 starter.
Use /webmaker-reactthreefiber for the viewer and /webmaker-drei for scene helpers.
Give it confident typography, a clear story and an accessible call to action.
Load 3D on demand, keep a poster fallback, respect reduced motion and check mobile.
Implement the site, run its production build and visually verify the result.
```

Slash spellings are prompt aliases, not shell commands or registered editor commands. Some hosts also support `$webmaker`. If discovery fails, explicitly reference the installed SKILL.md.

## Optional Studio and starter

```sh
npm run studio
```

Open the printed local address. Studio offers visual editing, starter selection and source export. Its AI Editor requires a separately installed and authenticated Codex CLI. Visual editing works independently.

To run the standalone starter:

```sh
npm run dev --prefix templates/product-showcase
npm run build --prefix templates/product-showcase
```

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| Skill not discovered | Start a fresh assistant chat or explicitly reference SKILL.md. |
| Installer refuses existing skill | Review the existing files; choose a different project/destination without overwriting custom work. |
| PowerShell blocks npm | Use `npm.cmd`. |
| Peer dependency conflict | Inspect the website's React/Fiber versions; do not force-install the entire toolkit into it. |
| Source restore reports modifications | Preserve and review the checkout before changing its revision. |
| Browser checks have no browser | Use installed Chrome/Edge or run `npx playwright install chromium`. |
| WebGL unavailable | Verify the static poster and HTML fallback. |

[Gallery](../README.md) · [Recipes](RECIPES.md) · [Studio and maintenance](OPERATIONS.md)
