# Changelog

## 2026-10-24 — Collar coverage and original footwear restoration

- Recovered 2,055 source-blue collar, cuff and fabric-edge pixels missed by skin protection masks.
- Restore native footwear colours and details by default, including City Minimal brown sandals.
- Clothing presets preserve the separately selected footwear colour.
- Added source-blue coverage regression validation and refreshed mask cache identity.


## 2026-10-24 — Independent mannequin colour controls

- Each garment colour updates only that garment across all five poses, including footwear and the visible Utility Travel cap.
- Replaced rectangular build-time recolours with pose-specific garment masks and source-based shading.
- All suggested palettes and custom mixes now render in the browser; Reset restores the initial palette.
- Corrected original-preview colours, exposed rendering errors, and kept owned item colours separate from preview colours.


All meaningful Static Threads changes are recorded here.

## Unreleased

### Added

- Day 1 kinetic walk-in closet: hanger rail browsing with hover/focus/touch selection, directional depth, pointer-driven parallax, previous/next controls, selected-garment inspector, mobile horizontal browsing and reduced-motion accessibility.

- Initial Next.js and TypeScript application foundation.
- Responsive wardrobe catalogue with search, brand, category and size filters.
- Empty-state workflow for the first approved wardrobe item.
- Structured JSON wardrobe catalogue and shared TypeScript model.
- Product-only image processing script with optional background removal.
- Catalogue metadata and image validator.
- Public-repository privacy controls for original wardrobe photographs.
- Catalogue contribution, naming and review documentation.
- GitHub Actions validation workflow.
- GitHub Pages static export and deployment workflow.
- Sale Radar preference interface with discount, maximum-price and retailer controls.
- Planned multi-retailer coverage for direct brand stores, JD Sports, Sports Direct and NEXT.
- Device-local sale preference storage and browser notification permission flow.
- Sale monitoring architecture and retailer adapter documentation.

### Changed

- Reworked the complete interface into a minimal dark visual system.
- Added restrained mint, violet, amber, coral and blue accents for hierarchy and interaction.
- Added sticky navigation, responsive sale-monitoring sections and improved mobile layouts.
- Updated the homepage positioning around wardrobe understanding and better purchase decisions.
