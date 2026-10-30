# Changelog

## 2026-10-30 — Account authentication lifecycle

- Complete magic-link callbacks using the Supabase SDK with PKCE, session persistence and refresh.
- Verify account identity before displaying signed-in state; synchronize authentication changes across tabs.
- Add browser-scoped logout, resend cooldown and safe recovery messages for failed/expired links.
- Preserve account styling and demo catalogue; distinguish account sign-in from future private wardrobe sync.
- Add intercepted-service account regression checks and production configuration guidance.


## 2026-10-24 — Six direct mobile island links

- Show Style, Decide, Wardrobe, Similar, Radar and Account together in one mobile island.
- Remove the Menu dialog and duplicate top Account shortcut.
- Keep the island on the Account page, with return links to all five homepage sections.
- Preserve active highlighting, bottom safe-area spacing and desktop navigation.
- Check six-link geometry, readable labels, 44px targets and navigation at small phone widths.

## 2026-10-24 — Mobile floating navigation dock

- Replace the crowded mobile header links with a floating Style / Wardrobe / Decide / Menu dock at widths up to 680px.
- Keep a compact ST header and Account shortcut; retain desktop navigation.
- Add an accessible expanded menu with all sections, keyboard dismissal, focus restoration, scroll locking and safe-area spacing.
- Track the current section as the page scrolls and reserve space below content for the dock.
- Offset the mobile home anchor so the ST shortcut keeps the hero clear of the sticky header.

## 2026-10-24 — Saved inspiration complete-image combinations

- Add five-view mannequin photography to all eight saved inspiration looks, with three independently generated palettes per look.
- Reuse complete-image toggles, preloading, clipped native-resolution views and full-resolution links.
- Update target piece descriptions with the selected palette while keeping inspiration separate from wardrobe-owned items.
- Validate all 40 outfit boards and 200 frame windows in CI.

## 2026-10-24 — Complete generated image combinations

- Restore the four approved original outfit boards as the default views.
- Add twelve independently generated colour boards: four complete choices for each recommendation, with five views each.
- Replace garment filters with a complete-look toggle, preserving native resolution, original footwear, fabric detail and lighting.
- Clip each native frame explicitly so adjacent board panels cannot enter letterboxed space.
- Display lossless images through aspect-preserving frame windows; remove runtime recolouring and contrast/saturation filters.
- Preload/decode before switching, keep the previous image on load failure, and guard against stale rapid-toggle results.
- Validate all image hashes, lossless RGB pixels, resolution and 80 view windows in CI.


## 2026-10-24 — Layered trouser coverage repair

- Replaced generic trouser masking for Layered Neutral with source-specific contours for all five poses.
- Included the seated lap/hips, waistband and upper thighs while protecting hands, the chair, leg gaps and footwear.
- Added direct regression probes for the previously missed denim areas and protected regions.
- Refreshed mask cache identity for returning browsers.


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


### Closet rail preview

All 26 wardrobe items are accessible on the rail. Hover, keyboard focus, tap and previous/next controls update a persistent product preview with catalogue details and recorded wear history. Rail and catalogue use the configured product image when available, preserving its colours and proportions against a warm neutral backdrop. All 26 records now reference individually generated photorealistic product images, authorised by the user, on a consistent warm neutral studio background. They represent the catalogue descriptions and are identified as generated images, rather than exact photographs of owned garments. Native 1254px images are encoded as high-quality WebP without recolouring or cropping. Generation prompts, dimensions and checksums are in data/catalog-image-sets.json.


### Compact closet image cards

Catalogue product images now fit square, responsive frames. Explicit image dimensions and positioning prevent native-resolution files from expanding the cards or clipping the garments. Browser checks cover all 26 items across six categories at mobile and desktop widths, including search filtering.


### Confirmed wardrobe brands

Olive Cargo and Black Cargo are Pull&Bear; Brown Cap is Zara. These catalogue corrections flow through product cards, rail details, brand filters and owned-item recommendations.


### Mobile header branding

The mobile header now shows Static Threads beside the ST logo, using the same wordmark styling as desktop. This applies to both the home and account pages.


### Consistent desktop navigation

Desktop navigation now uses Style, Decide, Wardrobe, Similar, Radar and Account, with the same six icons as the mobile dock. A shared SVG component keeps both views consistent, and compact spacing keeps the desktop header clear at tablet widths.


### Zara long-sleeve raglan correction

White Navy Raglan is a Zara long-sleeve T-shirt. Its product image now has full-length navy sleeves while retaining the white body, navy neckline and original studio background. A new asset filename updates the rail, preview and catalogue without stale image caching.


### Powerlook textured shirt sleeve correction

White Textured Shirt is a full-sleeve Powerlook shirt. Its product image now has long sleeves in the existing cream textured fabric, and its type reads long-sleeve textured shirt. The versioned image reference updates the rail, preview and closet card.


### Netplay patterned shirt sleeve correction

Navy Pattern Shirt is a half-sleeve Netplay shirt. Its product image now has short sleeves while keeping the existing navy colour and grey motif. The versioned image reference updates its rail, preview and closet card.
