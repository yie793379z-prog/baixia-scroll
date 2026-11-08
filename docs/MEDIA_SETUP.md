# Running with media

This repository builds and tests independently of the production media pack.
For a fully illustrated local session, supply media that you are entitled to use:

- `public/tiles/fengning/scroll.dzi` and its `scroll_files/` Deep Zoom tiles.
  The current game coordinates assume a 132458 x 4146 pixel scroll.
- `public/cinematic/fengning-unfurl.webp` for the opening preview.
- `public/review/` and `public/culture/` images referenced in `data/` and `src/content/`.
- `public/painting-videos-v2/` files named in `data/painting-videos.v1.json`.
- Optional `public/audio/jinling-yimeng.mp3`, subject to the music's own rights.
- Optional 3D scene packs named in `src/games/first-person/landscapeAssets.ts`;
  procedural fallback geometry remains in the source.
- Optional hand-tracking model/WASM files expected by `src/gestures/`.

No script silently downloads the production artwork or music. The source release
does not grant permission to redistribute those files. Keep original scans and
research outside `public/`; never publish the entire working folder.

For an asset-independent code review use the tests. For the complete illustrated
experience use the live game linked in the README.
