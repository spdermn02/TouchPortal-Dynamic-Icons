
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

**Full log:** [v1.2.0-alpha2...v1.2.0-alpha3](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha2...v1.2.0-alpha3)


---
## Next version
### New Features
- Plugin now logs all messages to its own file on all platforms, independent of Touch Portal's own log. Log file is located in plugin's installation folder. Logging settings can be adjusted using a configuration file. By default log files are rotated at 5MB maximum size and up to 4 old log files are kept. ([#23])

### Fixes
- Image layer type was always being replaced with new instance of `DynamicImage()` instead of reusing existing instance. ([e7a467b5])
- Stroke line thickness could not be reset to zero after being changed to non-zero w/out deleting the whole icon instance. ([14449c23])

### Element Changes
#### Simple Round Gauge ([#26])
- Added line width and radius settings.
- Add "auto" direction to toggle CCW drawing with negative values.
- Removed shadow toggle property (use transparent color to disable shadow, previous versions of the action still work);
- Fixed that could not set a starting degree of zero.
- The starting degrees action data field now allows negative values and inline evaluation.
- Moved shadow color to end of action's properties list.

### Other Changes
- **Removed/disabled GPU rendering feature** including the plugin setting and "Generate Icon" action options. This feature proved ineffective and caused peripheral issues. May be re-introduced in a later version. See [#25] for details.
- Optimized data transfer between the drawing canvas ('skia-canvas') and final compression step ('sharp') by ~400% using updated custom version of 'skia-canvas' to export raw pixel data. ([cc4717e2], [skia-canvas@8cbc8910])
- Slightly optimized image file loading (before cache) by creating canvas images using raw pixel data instead of encoded/decoded PNG format. ([72b907d5], [skia-canvas@1e7e09b7])
- Fixed upstream issue in 'skia-canvas' which sometimes caused full circles to not be drawn at all. ([skia-canvas@bb99a3ad])
- Updated 'sharp' and underlying 'libvips' libraries to latest versions for improved image compression performance. ([#24])
- Updated TP Node API ('touchportal-node-api') to latest version allowing log message redirection to plugin's log (instead of always going to TP's log) and graceful plugin shutdown on exit. ([4b69a8d9], [0a65d4b2], [tp-api#36], [tp-api#38])
- Minor performance optimizations. ([e830d054], [caacff04], [tp-api#37])

**Full log:** [v1.2.0-alpha3...HEAD](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha3...HEAD)

[#23]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/23
[#24]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/24
[#25]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/25
[#26]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/26
[e7a467b5]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/e7a467b55464e098435ba4cfdaa327c8cc3738d8
[14449c23]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/14449c23a4165dd15c9d26ba11749ccab48e0858
[cc4717e2]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/cc4717e2de6f0db11c8e4a4acd77b66f0ba173b2
[72b907d5]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/72b907d5b63c0817c33e76efe5ec5325b893ec8d
[4b69a8d9]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/4b69a8d9533dae7e3fed012a204da8d270277189
[0a65d4b2]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/0a65d4b2161832a1e2e79d5c10002fb3cc802d29
[tp-api#36]: https://github.com/spdermn02/touchportal-node-api/pull/36
[tp-api#38]: https://github.com/spdermn02/touchportal-node-api/pull/38
[e830d054]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/e830d0543eefdc2deee2678507fb87865f7080ee
[caacff04]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/caacff0492c7f662b4cc28838a4e2c0f3f8e87ef
[skia-canvas@8cbc8910]: https://github.com/mpaperno/skia-canvas/commit/8cbc8910cc94c202c9edf233cfd67ba1deca8997
[skia-canvas@1e7e09b7]: https://github.com/mpaperno/skia-canvas/commit/1e7e09b7aaa2e2923d107ad2494b8c26329a9b97
[skia-canvas@bb99a3ad]: https://github.com/mpaperno/skia-canvas/commit/bb99a3adb98648b6d24a4d4488a9577d57586683
[tp-api#37]: https://github.com/spdermn02/touchportal-node-api/pull/37
