
# Touch Portal Dynamic Icons - Change Log

## v1.0.0 - Initial Release
### Features:
- Actions for Simple Round Gauge and Simple Bar Graph

---
## v1.1.0-alpha1 - Layered Icons

### Features:
- Actions To allow for multiple layered icons
- Actions to manipulate origin/scale/transform/etc the layered icons
- Image Cache for faster image compilation
### Build Scripts:
- Conversion to js build script for multi arch compile at once
- entry.tp generator script

**Full log:** [v1.0.0...v1.1.0-alpha3](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.0.0...v1.1.0-alpha3)

---
## v1.1.0
### New Features:
- Allow dynamically evaluate names for images files [#6](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/6)
- An image layer's source file property can now be updated using the "Update a Value" action.
- Use 'file' type input fields for image source (for TP v3.1b8+) [#7](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/7)
- Add plugin setting to control default base image directory [#8](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/8)
### Fixes:
- Fix name of icon that is built with plugin [#9](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/9)

**Full log:** [v1.0.0...v1.1.0](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.0.0...v1.1.0)

---
## v1.2.0-alpha1 - Tiled Icons & More Options
### New Features:
- Allows generated icons to be "tiled" across multiple TP button spaces to create non-square images.
- Added a new Linear Progress Bar element with many stylng options. Designed to take advantage of new tiling feature.
- Rectangle shapes can now be drawn of any size using absolute (px) or relative (%) values. Size properties are dynamically evaluated (allowing embedded JS expressions).
- Several sizing properties (like stroke width or radius) can now be specified as absolute pixels as well as percentages.
- Radius sizes, stoke widths, shadow coordinates, and Effect Filter values are now dynamically evaluated by the plugin, allowing embedded JS expressions.
- Added plugin setting and per-image option to enable or disable GPU-based image rendering (on supported GPUs). Previously, GPU rendering was always enabled when available.
  When disabled, or not available, rending is done using CPU resources (which may be faster or more efficient in some cases depending on other loads).

### Fixes:
- Shadows are no longer applied to both the fill and stroke of rectangles or text -- they're only drawn on the fill, or the stroke if the fill is transparent.
  This prevents the shadow from overlaying the fill.
- Cached images are now automatically cleared when an icon instance is deleted.

### Changes:
- If a shadow is applied to a Styled Rectangle element, the drawn rectangle size is automatically adjusted so the shadow fits within the overall icon dimensions.

### Build Scripts:
- Changes for MacOS and Linux builds to include the required VIPS graphics library binary.
- Update/fix the TP startup command line in entry.tp for MacOS and Linux builds.

**Full log:** [v1.2.0-alpha1...v1.1.0](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.1.0...v1.2.0-alpha1)

---
## v1.2.0-alpha2
- Fixes issue with missing TP states when changing icon tiling properties.
  ([#12](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/12))
- Fixes stoke width action data fields to allow text input (for variables and evaluated expressions).
  ([#13](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/13))
- A warning is no longer logged when deleting an icon instance which doesn't have any image layers.
  ([9472b853](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/9472b8537ec42d30b373a074fe357a9f61a22a2c))

**Full log:** [v1.2.0-alpha2...v1.2.0-alpha1](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha1...v1.2.0-alpha2)

---
## v1.2.0-alpha3 - Rectangular Icons, Compression Options & Memory Fix
### New Features:
- Both width and height dimensions can be specified for an icon in the New Layered Icon action, allowing non-square images.
  ([#20](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/20))<br/>
  (This also changes how tiling works for the new version of the action, see Changes below.)
- The compression level of produced icon images can now be specified globally in plugin settings and/or per icon in the Generate Layered Icon action. Compression can also be disabled entirely. ([#16](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/16))
- An Effect Filter layer's _filter_ property can now be changed using the Update a Value action. ([6a8774ec](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/6a8774ec16d0379661aa71617d08f3959e48aafb))

### Fixes:
- Fixes a slow memory leak issue which can get significant if icons are generated continuously over a period of time (probably since v1.1.0-a1).
  ([#18](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/issues/18))
- Fixes that the Simple Bar Graph 'bar width' property was ignored and the width was always 10px (since v1.1.0-a1).
  ([17869df](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/17869df7f3d338941aa0bd70e963637f1e7fe310))
- Fixes that a Canvas Filer wouldn't be properly applied to a Simple Round Gauge, nor any following layers.
  ([1768f291](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/1768f291d896e1154db6c6e50e4ce207844dfde6))
- Fixes that Windows-style paths (with backslashes) in the Image action's 'file' property were mangled (since v1.1.0).
  ([0c4f5b5](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/0c4f5b5d9ccbabb99c5e834e27ca238854eb736a))
- Fixed wording about relative file paths on Image action.
  ([7b1c76e7](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/7b1c76e7389a73c6ba1c6e9cf265f07622e0cafe))

### Changes:
- Tiling feature in new version of New Layered Icon action will now split the specified icon size into the specified number of tiles,
  instead of each tile being of the specified size.
  ([#20](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/20))<br />
  (**Previous versions of the action (1.2-alpha1 & 2) are _not_ affected, but support for them will be removed in the future.**)
- Default icon size plugin setting can now optionally include both width and height in the form of `<width> x <height>`, or with a comma. E.g.: "128 x 128" or "86, 64"
  ([#20](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/20))
- Plugin version number shown in TP Settings now has an extra set of digits at the end to distinguish between various pre- and final releases of a n.n.n version
  (eg. 1.2.3-alpha4 is `1020304` and final would increment the last digit, eg. `1020305`).
  ([#21](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/21))
- Icon names in the _Plugin Action_ action and _List of created icons_ state are now sorted alphabetically.
  ([00977f3a](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/00977f3a8904a68d4a378d8a91a7248919b9bf3d))
- Performance improvements and optimizations to plugin core and external modules.
  ([4f6c9b5a](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/4f6c9b5abb73b96fffbcd630bc25f84413ee044d),
  [07e4d3fe](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/07e4d3feceaa2f30811b6129b8c8ce0fd770ea5d),
  [tp-api#29](https://github.com/spdermn02/touchportal-node-api/pull/29),
  [tp-api#31](https://github.com/spdermn02/touchportal-node-api/pull/31),
  [skia-canvas@f0e6d816](https://github.com/mpaperno/skia-canvas/commit/f0e6d816fd4770e313ed29c284e773eb947d7600),
  [skia-canvas@c364fbdb](https://github.com/mpaperno/skia-canvas/commit/c364fbdb5d109187b9aa8bf0676497a2c64a4b90))

### Build Scripts:
- Individual platform release builds can now be `npm run` with  `build-win`, `build-mac`, `build-linux` or `build -- -p (windows|linux|macos)`
  ([#17](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/17))

**Full log:** [v1.2.0-alpha2...HEAD](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha2...HEAD)
