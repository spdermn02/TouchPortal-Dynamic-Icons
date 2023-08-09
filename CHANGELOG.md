
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

---
## v1.1.0
### New Features:
- Allow dynamically evaluate names for images files (https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/6)
- An image layer's source file property can now be updated using the "Update a Value" action.
- Use 'file' type input fields for image source (for TP v3.1b8+) (https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/7)
- Add plugin setting to control default base image directory (https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/8)
### Fixes:
- Fix name of icon that is built with plugin (https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/9)

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

---
## v1.2.0-alpha2
* Fixes issue with missing TP states when changing icon tiling properties (https://github.com/spdermn02/TouchPortal-Dynamic-Icons/pull/12).
* Fixes stoke width action data fields to allow text input (for variables and evaluated expressions).
* A warning is no longer logged when deleting an icon instance which doesn't have any image layers.


---
## Next version
* Allow updating a Canvas Filter layer's filter property using the "Update Value" action.
