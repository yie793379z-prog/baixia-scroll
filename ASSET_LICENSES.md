# Asset licensing and distribution boundary

The root MIT license applies to the project's own software and documentation.
It does not grant rights over third-party materials, even when a live website
can display those materials. Attribution is not itself redistribution permission.

| Material | Status in this source repository | Applicable terms |
| --- | --- | --- |
| Application code and authored configuration | Included | MIT, except identified dependencies |
| Authored scene logic, coordinate metadata and cultural commentary | Included | MIT for the project's contributions; quoted historical text and cited works retain their own status |
| Right-hand mesh and photographed skin, derived from para / MakeHuman FPS Arms | Included | CC0-1.0; see `public/models/human-hand/LICENSE.txt` |
| Painting scans, full master images, tiles, crops and scroll preview | Excluded | Permission for the specific digital source has not been established for this repository; the age of the depicted painting does not by itself verify the scan's distribution terms |
| Background music and user-supplied scene videos | Excluded | No blanket MIT or public redistribution permission is asserted |
| Research PDFs, raw excerpts and private production archives | Excluded | Original rights holders' terms |
| Environment GLBs, photographic textures and HDR images | Excluded | Existing production records identify Poly Haven and ambientCG materials as CC0; the source repository does not redistribute the full scene packs |
| MediaPipe browser model and WASM files | Excluded; dependency installed separately | Apache-2.0 notices are present in the production bundle; verify each downloaded model's terms before distribution |
| Other fonts and production artwork | Excluded | Verify their individual terms before adding them |

## Included hand provenance

- Author: para; original mesh and skin by MakeHuman.
- Source: https://opengameart.org/content/fps-arms-rigged-only
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Changes: right-hand extraction, smooth continuous surface, retained-resolution
  UV crop, new articulated grip animation and canonical game coordinate frame.
- The manifest records the delivered model filename and size.

## Recorded production texture sources (not bundled here)

https://polyhaven.com/license
https://polyhaven.com/a/rough_wood
https://polyhaven.com/a/white_plaster_02
https://polyhaven.com/a/old_sandstone_02
https://polyhaven.com/a/chinese_hackberry_bark
https://polyhaven.com/a/dirt_floor
https://polyhaven.com/a/leafy_grass
https://polyhaven.com/a/mossy_stone_wall
https://polyhaven.com/a/cobblestone_floor_03
https://polyhaven.com/a/kiara_6_afternoon
https://ambientcg.com/view?id=LeafSet024
https://docs.ambientcg.com/license/

Before proposing a new asset, include its creator, original source URL, exact
license, attribution requirements and a redistribution check. Do not upload local
master images or private research merely to make a build look complete.
