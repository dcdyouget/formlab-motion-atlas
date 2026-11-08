# Athlete model

`athlete-model.js` is an offline, processed MakeHuman Community mesh. Its source assets are:

- [Base mesh](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) — SHA-256 `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`.
- [Caucasian male, young morph](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/caucasian-male-young.target) — SHA-256 `70e228ba7164737dae664454394536fc5935fa48d333c1a97d77e2dc6eacc5f5`.
- [Male young, maximum-muscle, average-weight morph](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target) — SHA-256 `c171ff9cc95e96273beb3e3b1969a01988c2d4982ebc6fe04bf81cf72ee3b295`.

The MakeHuman source file headers mark these assets CC0 1.0. MakeHuman's [license notice](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md) states that bundled graphical assets, including the base mesh, are CC0 1.0; the [asset license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md) provides the legal text. The MakeHuman application code is AGPL, and is not included here.

The build applies the male and maximum-muscle morph targets to the base mesh, recomputes area-weighted normals, and adds restrained geometric relief for the pecs, abdominal pads, deltoids, arms, glutes, thighs, and calves. It also adds fitted shorts and gray trainers. The original helper hair, clothing, tights, and genital meshes are excluded. New shoe vertices are bound to the existing foot bones.

The resulting mesh data is derived from CC0 assets and is released under **CC0 1.0 Universal**. No model, texture, or runtime code is fetched from a network.

See the [CC0 1.0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

Skinning uses the official [MakeHuman default skin weights](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/rigs/default_weights.mhw) under CC0. The 22-bone viewer rig retains separate clavicle, shoulder-cap, elbow and forearm-rotation influences. The grip shapes use the source finger landmarks and per-digit skin weights. Muscle outlines and fabric boundaries are clipped in rest space before rendering.

The sixteen additional exercise records are selected from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), distributed under the [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). Each exercise links to its original record. The Chinese adaptations, animation and rendered thumbnails were created for FormLab.

## Illustrated athlete surface

The interactive mesh retains the CC0 MakeHuman source credited above. This revision further sculpts the shoulders, back and posterior chain. The neutral and muscle study textures in `athlete-surface.js` were generated for FormLab from the original RDL illustration and orthographic silhouettes of this mesh. They use fixed surface coordinates and deform with the moving mesh. The original twelve exercise illustrations remain the reference artwork; the sixteen later covers are renders of the interactive model.
