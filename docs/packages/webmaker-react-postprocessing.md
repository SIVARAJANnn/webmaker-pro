# The cinematic finish

**`/webmaker-react-postprocessing` — Add selective rendering effects.**

![The cinematic finish: AI-generated concept illustration](../assets/webmaker-react-postprocessing.png)

*AI-generated concept illustration; not a screenshot or a bundled model.*

## Where and when to use it

After the base scene works, when bloom, tone mapping or depth of field improves visual emphasis.

## How it helps you build

Directs attention and gives a scene a controlled cinematic finish.

## Try this prompt

```text
/webmaker-react-postprocessing Add subtle selective bloom to the emissive parts of my Fiber scene. Keep product detail sharp and provide a low-cost mode for mobile.
```

## Installation and practical notes

Install the skill using [Step 1](../INSTALLATION.md#step-1--install-the-skills-in-your-favorite-editor), then prepare the toolkit with [Step 2](../INSTALLATION.md#step-2--prepare-all-subpackages-with-one-prompt). Full-screen effects consume GPU time. Measure their cost and avoid applying bloom to every surface.

Pair this with `/webmaker` for the surrounding page, typography and responsive layout. Verify actual rendering, keyboard interaction, reduced motion and the production build on your target devices.

[Read the skill](../../skills/webmaker-react-postprocessing/SKILL.md) · [Upstream project](https://github.com/pmndrs/react-postprocessing) · [All 11 skills](../../README.md#explore-the-11-skills)
