# Contributing

Open an issue describing the problem, expected behavior and affected skill or template. Include browser/device details and screenshots for visual issues.

Use Node 22.20+ and follow [installation](docs/INSTALLATION.md), then run:

```sh
npm run check
npm run check:types
npm run check:docs
npm run build --prefix templates/product-showcase
```

For scene or Studio changes, run the relevant check:browser or check:studio command and visually verify interactions, reduced motion and fallback rendering.

Preserve skill names and source attribution. Update source locks, dependency notes and validation together when upgrading. Document the provenance and license of new assets. Keep secrets, local sessions, dependencies and build output out of commits. Label concept art separately from actual screenshots.
