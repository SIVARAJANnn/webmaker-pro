# Make 3D lighter

**`/webmaker-gltf-transform` — Inspect and optimize glTF and GLB assets.**

![Make 3D lighter: AI-generated concept illustration](../assets/webmaker-gltf-transform.png)

*AI-generated concept illustration; not a screenshot or a bundled model.*

## Where and when to use it

Before publishing a model-heavy site, or when asset downloads and GPU memory become expensive.

## How it helps you build

Finds redundant data and helps reduce asset weight while checking geometry, materials and animation quality.

## Try this prompt

```text
/webmaker-gltf-transform Inspect my GLB, report its size and resource counts, then create a separate optimized version. Preserve named parts and animations, and compare the rendered result before replacement.
```

## Installation and practical notes

Install the skill using [Step 1](../INSTALLATION.md#step-1--install-the-skills-in-your-favorite-editor), then prepare the toolkit with [Step 2](../INSTALLATION.md#step-2--prepare-all-subpackages-with-one-prompt). A build-time CLI, not a browser effect. The supplied model:prepare command deduplicates; more aggressive compression needs asset-specific decisions.

Pair this with `/webmaker` for the surrounding page, typography and responsive layout. Verify actual rendering, keyboard interaction, reduced motion and the production build on your target devices.

[Read the skill](../../skills/webmaker-gltf-transform/SKILL.md) · [Upstream project](https://github.com/donmccurdy/glTF-Transform) · [All 11 skills](../../README.md#explore-the-11-skills)
