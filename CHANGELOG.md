
# Touch Portal Dynamic Icons - Change Log

## v1.3.0

### New Features
- Added "Circular Tick Marks" and "Linear Tick Marks" actions for drawing gauge "ticks" and/or labels with multiple options (TP v4+ only).
- Added "Run Custom Script" action to run user-provided JavaScript code with access to current Canvas context for custom drawing (see [Custom Scripts] wiki page for details).
- Added "Save Icon to File" action to export generated images to files in various formats. This can be found in the "Layer Actions" group.
  - Available export formats: AVIF, GIF, JPEG, PNG, TIFF, & WebP.
  - Each export format has various options (such as compression level, quality, etc) that can be specified in a "option=value, ..." list and have been documented in the wiki: [File Output Options].
- Added `vw`, `vh`, `vmin` & `vmax` relative size unit types for use in font sizing and other CSS-like properties. These correspond to the [standard CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/length#vh) versions and represent 1 percent of the current icon size ("viewport") width & height, or minium/maximum of the width or height, respectively. E.g. `5vh` is 5% of the icon height, or `5vmin` is 5% of the smaller of icon width or height.
- Added new "Wrap Width" option to "Draw - Text" action which will automatically wrap long text to the specified width if it won't fit on one line.
- Added option to control color quality (number of colors) of generated images to help further reduce image data size. Default value is available as a new plugin setting and the quality can also be set per layered icon in the "Generate" action.
- Added new plugin setting to control the maximum number of threads used by `skia-canvas` for drawing images.

### Changes
- SVG images are now kept as scalable vector graphics instead of being rasterized at a fixed size during initial loading. This prevents any pixelation due to scaling, including when manipulating the image with transformations. However, it comes with some caveats:
  - The new SVG parser is more strict about syntax and may fail to load some documents. In such cases the plugin will fall back to using the previous method of loading SVGs to raster images.
    If your SVGs appear pixelated, check the plugin's log file for warnings about this, and validate/simplify your SVG syntax if you find loading errors.
  - The new parser may also log warnings about element(s) it doesn't "like" but which don't prevent loading the image. These will show up in the TP log since unfortunately there's no way for us
    to intercept them. If you see messages like "cannot append child nodes to an SVG shape" being logged, ignore them or check your SVGs.
- "Draw - Text" action now properly supports `serif`, `sans-serif`, `monospace`, and `system-ui` generic font families. Existing icons which were using generic font names will likely change as a result.
- Replaced "Tracking" option with "Letter Spacing" on "Draw - Text" action.
- Improved text rendering and alignment (may have slight alignment differences with some fonts vs. previous version).
- Converted the layer "position" field in all "Animate & Update" actions to "text" type which allows TP variables to be used.
- Added "Auto" as a choice for "Draw Direction" setting in "Paths - Add Ellipse / Arc" action. This automatically draws in the counterclockwise direction if the specified ending angle value is lower than the starting angle.
- A message is now written to the log file whenever deleting an icon instance.
- Moved the plugin's actions to Touch Portal "Tools" category.

### Fixes
- Improved stability with multi-layered images to ensure elements are applied in the correct order, especially when using elements like complex paths or generating many images at once.
  In some (rare) cases the actions could not be parsed in time before the next action's data came in, leading to elements being assigned to the wrong layers.
- Fixed rendering issues with some combinations of drop-shadow effects and rotation transformations (upstream in `skia-canvas`).
- Fixed clearing the image cache for an icon instance which shares the cached image with other icon instances but wasn't the first to use that image.
- Fixed skew transformation not working properly except with very large values (wasn't scaled correctly).
- Fixed that "Simple Bar Graph" used as a standalone (non-layered) icon didn't respect the default icon size from plugin settings when calculating how many bars can fit on one image.
- Fixed that "small-caps" font variant was not being respected in the "Draw - Text" action font specification.

### Other Updates
- Updated `skia-canvas` drawing library to v2.0.2 (includes all related upstream libraries and the underlying _Skia Graphics_ itself).
- Updated `sharp` image loading and compression library to v0.33.5.
- Releases now use NodeJS v22 (LTS) runtime, up from v18.
- Added separate release builds for MacOS Intel (x64) and ARM64 (Mn) architectures.

**Full log:** [v1.2.0-beta1...v1.3.0](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-beta1...v1.3.0)

[File Output Options]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/wiki/File-Output-Options
[Custom Scripts]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/wiki/Custom-Scripts

---
## v1.2.0-beta1 - Path Operations, Dynamic Colors, Enhanced Round Gauge, & More

### New Features
- Added a new set of actions for working with drawing paths (un-styled drawing elements). Completely freeform paths can be created, including support for SVG path syntax, as well as basic shapes like rectangles and ellipses.
  Paths can be combined and transformed in various ways to create complex shapes. They can then have a drawing style applied to them, or be used as a clipping region to constrain further drawing.
  For more details see the [notes on PR #27][#27].
- Added new "Animate - Update a Color" action to dynamically change a color of an existing layer element. ([#28])
- Added plugin setting to control the number of CPU threads used for final image compression and output.
- Plugin now logs all messages to its own file on all platforms, independent of Touch Portal's own log. Log file is located in plugin's installation folder. Logging settings can be adjusted using a configuration file. By default log files are rotated at 5MB maximum size and up to 4 old log files are kept. ([#23])

### Fixes
- The "Finalize Only" and "Render Only" choices were ignored in the "Generate Layered Icon" action and icon was always finalized and rendered. ([d5ec58c9])
- Image layer type was always being replaced with new instance of `DynamicImage()` instead of reusing existing instance. ([e7a467b5])
- Stroke line thickness could not be reset to zero after being changed to non-zero w/out deleting the whole icon instance. ([14449c23])

### Major Changes
- **Removed/disabled GPU rendering feature** including the plugin setting and "Generate Icon" action options. This feature proved ineffective and caused peripheral issues. May be re-introduced in a later version. See [PR #25][#25] for details.

### Element Changes
#### Simple Round Gauge ([#26])
- Added line width and radius settings.
- Add "auto" direction to toggle CCW drawing with negative values.
- Removed shadow toggle property (use transparent color to disable shadow, previous versions of the action still work);
- Fixed that could not set a starting degree of zero.
- The starting degrees action data field now allows negative values and inline evaluation.
- Moved shadow color to end of action's properties list.
#### Simple Bar Graph
- The new "Update a Color" action can be used to change the color of the _next_ bar segment(s) to be drawn, allowing for multi-color graphs (see [PR #28][#28] for an example).
#### Image
- Added ability to use base64-encoded data as source input by using a "data:" prefix before the b64 data string. For example to use the result of another plugin's dynamic image as a layer, or encoded data from a web URL request. ([#29])

### Other Changes
- For Touch Portal v4 ([#30]):
  - Plugin's actions are now sorted into sub-categories by function.
  - Added help text for each of the plugin's options shown in TP's Settings dialog.
- Concurrent system thread usage changes: ([ee62e201])
  - The number of simultaneous image rendering threads is now set to use half the logical cores available on the host system. Previously this was always fixed to 4 threads.
  - The default number of simultaneous image compression threads has been reduced to using half the logical cores available (controllable via new Setting mentioned above). Previously this used as many threads as there were logical cores.
- Optimized data transfer between the drawing canvas ('skia-canvas') and final compression step ('sharp') by ~400% using updated custom version of 'skia-canvas' to export raw pixel data. ([cc4717e2], [skia-canvas@8cbc8910])
- Slightly optimized image file loading (before cache) by creating canvas images using raw pixel data instead of encoded/decoded PNG format. ([72b907d5], [skia-canvas@1e7e09b7])
- Fixed upstream issue in 'skia-canvas' which sometimes caused full circles to not be drawn at all. ([skia-canvas@bb99a3ad])
- Updated 'sharp' and underlying 'libvips' libraries to latest versions for improved image compression performance. ([#24])
- Updated TP Node API ('touchportal-node-api') to latest version allowing log message redirection and graceful plugin shutdown on exit. ([4b69a8d9], [0a65d4b2], [tp-api#36], [tp-api#38])
- Minor performance optimizations. ([e830d054], [caacff04], [tp-api#40])

**Full log:** [v1.2.0-alpha3...v1.2.0-beta1](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha3...v1.2.0-beta1)

[#23]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/23
[#24]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/24
[#25]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/25
[#26]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/26
[#27]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/27
[#28]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/28
[#29]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/29
[#30]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/30
[d5ec58c9]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/d5ec58c970b805aadd00477cebd874aadf3e8951
[e7a467b5]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/e7a467b55464e098435ba4cfdaa327c8cc3738d8
[14449c23]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/14449c23a4165dd15c9d26ba11749ccab48e0858
[ee62e201]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/ee62e201f4a87e80e29a2f852da71d81ab19f9aa
[cc4717e2]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/cc4717e2de6f0db11c8e4a4acd77b66f0ba173b2
[72b907d5]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/72b907d5b63c0817c33e76efe5ec5325b893ec8d
[4b69a8d9]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/4b69a8d9533dae7e3fed012a204da8d270277189
[0a65d4b2]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/0a65d4b2161832a1e2e79d5c10002fb3cc802d29
[e830d054]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/e830d0543eefdc2deee2678507fb87865f7080ee
[caacff04]: https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/caacff0492c7f662b4cc28838a4e2c0f3f8e87ef
[tp-api#36]: https://github.com/spdermn02/touchportal-node-api/pull/36
[tp-api#38]: https://github.com/spdermn02/touchportal-node-api/pull/38
[tp-api#40]: https://github.com/spdermn02/touchportal-node-api/pull/40
[skia-canvas@8cbc8910]: https://github.com/mpaperno/skia-canvas/commit/8cbc8910cc94c202c9edf233cfd67ba1deca8997
[skia-canvas@1e7e09b7]: https://github.com/mpaperno/skia-canvas/commit/1e7e09b7aaa2e2923d107ad2494b8c26329a9b97
[skia-canvas@bb99a3ad]: https://github.com/mpaperno/skia-canvas/commit/bb99a3adb98648b6d24a4d4488a9577d57586683


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
## v1.2.0-alpha2
- Fixes issue with missing TP states when changing icon tiling properties.
  ([#12](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/12))
- Fixes stoke width action data fields to allow text input (for variables and evaluated expressions).
  ([#13](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/13))
- A warning is no longer logged when deleting an icon instance which doesn't have any image layers.
  ([9472b853](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/commit/9472b8537ec42d30b373a074fe357a9f61a22a2c))

**Full log:** [v1.2.0-alpha2...v1.2.0-alpha1](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/compare/v1.2.0-alpha1...v1.2.0-alpha2)


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
## v1.0.0 - Initial Release
### Features:
- Actions for Simple Round Gauge and Simple Bar Graph
