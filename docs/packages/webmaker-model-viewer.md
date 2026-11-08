# A model, anywhere

**`/webmaker-model-viewer` — Embed a focused model viewer in HTML.**

![A model, anywhere: AI-generated concept illustration](../assets/webmaker-model-viewer.png)

*AI-generated concept illustration; not a screenshot or a bundled model.*

## Where and when to use it

On HTML or Astro product pages that need a single orbitable object, with optional device-supported AR.

## How it helps you build

Adds a self-contained web component without requiring a full React scene architecture.

## Try this prompt

```text
/webmaker-model-viewer Embed my GLB in this HTML product page with a poster, accessible description and orbit controls. Offer AR only where supported and retain a usable fallback.
```

## Installation and practical notes

Install the skill using [Step 1](../INSTALLATION.md#step-1--install-the-skills-in-your-favorite-editor), then prepare the toolkit with [Step 2](../INSTALLATION.md#step-2--prepare-all-subpackages-with-one-prompt). Uses a separate dependency profile. AR depends on browser, device, asset format and secure hosting; it is not universal.

Pair this with `/webmaker` for the surrounding page, typography and responsive layout. Verify actual rendering, keyboard interaction, reduced motion and the production build on your target devices.

[Read the skill](../../skills/webmaker-model-viewer/SKILL.md) · [Upstream project](https://github.com/google/model-viewer) · [All 11 skills](../../README.md#explore-the-11-skills)
