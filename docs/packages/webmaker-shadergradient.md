# Color in motion

**`/webmaker-shadergradient` — Create atmospheric animated backgrounds.**

![Color in motion: AI-generated concept illustration](../assets/webmaker-shadergradient.png)

*AI-generated concept illustration; not a screenshot or a bundled model.*

## Where and when to use it

In hero sections, launch pages and immersive section transitions when procedural color is the focal treatment.

## How it helps you build

Adds depth and motion without requiring a bespoke 3D model or a background video.

## Try this prompt

```text
/webmaker-shadergradient Add a slow cyan-to-violet shader gradient behind my hero. Keep text contrast strong, cap rendering cost on mobile and provide a static reduced-motion fallback.
```

## Installation and practical notes

Install the skill using [Step 1](../INSTALLATION.md#step-1--install-the-skills-in-your-favorite-editor), then prepare the toolkit with [Step 2](../INSTALLATION.md#step-2--prepare-all-subpackages-with-one-prompt). Use a simple CSS gradient when animation adds no value. The React library belongs in a compatible React project.

Pair this with `/webmaker` for the surrounding page, typography and responsive layout. Verify actual rendering, keyboard interaction, reduced motion and the production build on your target devices.

[Read the skill](../../skills/webmaker-shadergradient/SKILL.md) · [Upstream project](https://github.com/ruucm/shadergradient) · [All 11 skills](../../README.md#explore-the-11-skills)
