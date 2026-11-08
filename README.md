# Baixia Scroll / 白下行卷

A non-commercial cultural-education browser game inspired by Feng Ning's 1794
Jinling scroll painting. Explore the scroll, examine details, answer cultural
questions and play small interactive 3D activities.

[Play the game](https://baixia-scroll.zczcjzcj.chatgpt.site) ·
[Netlify site](https://harmonious-dango-b44962.netlify.app/) ·
[Code of Conduct](CODE_OF_CONDUCT.md) · [Contributing](CONTRIBUTING.md) ·
[Asset licensing](ASSET_LICENSES.md)

This repository contains the actual application source, interaction and physics
logic, authored content data, tests, build configuration and one redistributable
CC0 hand model. It is a source release of the game, not a mirror of its media CDN.

## Develop and verify

Use Node.js 22.12+ (24 LTS recommended) and npm:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

The release was checked with 158 tests. Build and unit tests work without the
private artwork/media pack. The complete visual game additionally requires assets
at the paths documented in [docs/MEDIA_SETUP.md](docs/MEDIA_SETUP.md). Without them,
the local viewer cannot display the painting; this is not a fully illustrated demo.
Use your own appropriately licensed media or the live game for visual review.

## Structure

- `src/viewer/`: tiled scroll viewer, camera and smooth movement.
- `src/gestures/`: local camera hand tracking and inertial scrolling.
- `src/games/`: mini-games, rendering, well grip/release and water dynamics.
- `src/media/`: scene video playback and loading.
- `src/content/` and `data/`: authored scenes, cultural questions and references.
- `tests/`: gameplay, camera, resource, media and geometry regressions.

Historical source claims, visual observations and game interpretations are kept
distinct in the content data. Contributions that correct evidence or improve
accessibility, performance and interaction are welcome.

## Privacy and media

Player notes/preferences are stored in the browser. Optional hand tracking runs
locally; the application does not upload camera frames to a recognition service.
The live game retrieves public media from its hosting providers.

The MIT license covers project-authored software and documentation. It does not
relicense dependency packages or third-party artwork, photographs, fonts, music,
videos, models or scans. See [ASSET_LICENSES.md](ASSET_LICENSES.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This repository omits media whose
redistribution permission has not been verified.

## Hosting

[This site is powered by Netlify](https://www.netlify.com/).
The live GPT address serves the frontend and hand model through Sites, and uses
Netlify for the existing public media. Hosting sponsorship is requested, not
claimed as approved. No donation, paid support or commercial hosting service is
offered by this project.
