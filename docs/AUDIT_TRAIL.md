# Static Threads Audit Trail

## 2026-10-15 — Day 1: Kinetic walk-in closet

### Product / Feature Log
- ID: ST-PROD-20261015-01
- Change: Added an interactive walk-in closet rail to the wardrobe experience.
- Scope: hanger-based garment browsing, hover/focus/tap selection, previous/next rail controls, selected garment inspector, mobile horizontal browsing.
- Rationale: make the wardrobe feel like a spatial closet rather than a static product grid while keeping the existing catalogue available for precise filtering.

### System Log
- ID: ST-SYS-20261015-01
- Change: Added pointer-position state to the wardrobe client component and CSS-variable-driven scene parallax.
- Constraint: no new runtime dependency; feature remains compatible with static Next.js export/GitHub Pages.

### Architecture Log
- ID: ST-ARCH-20261015-01
- Decision: Keep the closet interaction inside WardrobeCatalogView and derive all visual garments from the existing catalogue source.
- Rationale: avoids duplicate wardrobe state and keeps future Supabase migration straightforward.

### Accessibility / Validation Log
- ID: ST-QA-20261015-01
- Controls: keyboard focus, focus-visible treatment, touch/click fallback, aria labels, aria-live selected-item inspector, prefers-reduced-motion fallback.
- Mobile: rail remains horizontally browsable and disables pointer-parallax transforms on narrow screens.

### Risk & Assumption Log
- ID: ST-RISK-20261015-01
- Risk: high-motion 3D effects can be distracting or costly on lower-power devices.
- Mitigation: restrained transforms, no external animation library, reduced-motion override, pointer parallax disabled on mobile.
- Status: mitigated for MVP; performance should be rechecked with real product images.

### Decision Log
- ID: ST-DEC-20261015-01
- Decision: Use spatial interaction as a discovery layer, not a replacement for the searchable catalogue.
- Status: implemented.


## 2026-10-21 — Multi-angle virtual outfit lookbooks

### Product / Feature Log
- ID: ST-PROD-20261021-01
- Change: Upgraded Recommended Combinations with visual outfit lookbooks using a faceless mannequin and five practical views: walking, sitting, front, back, and side.
- Rationale: users should understand silhouette, drape, proportions, and movement before choosing an outfit rather than relying only on garment names and colour chips.

### System Log
- ID: ST-SYS-20261021-01
- Change: Added a reusable visual-lookbook data model and rendering layer to StyleStudio.
- Compatibility: remains compatible with static Next.js export and GitHub Pages.

### Architecture Log
- ID: ST-ARCH-20261021-01
- Decision: Separate visual-model metadata from recommendation logic.
- Model states: mannequin now; user-avatar later.
- Rationale: future user-photo virtual try-on can replace the mannequin renderer without changing the outfit recommendation contract.

### Recommendation Log
- ID: ST-REC-20261021-01
- Recommendation: keep five standard views for every rendered outfit so comparisons stay consistent across recommendations.
- Standard views: Walking, Sitting, Front View, Back View, Side View.

### Experiment Log
- ID: ST-EXP-20261021-01
- Hypothesis: multi-angle visualisation will improve recommendation confidence and reduce the gap between abstract outfit matching and practical appearance.
- Measurement later: outfit acceptance, view engagement, save/wear rate, and rejection reason.

### Risk & Assumption Log
- ID: ST-RISK-20261021-01
- Risk: generated mannequin imagery may not reproduce exact garment fit, fabric behaviour, or body proportions.
- Mitigation: label visuals as previews, preserve the actual wardrobe-item list beside each render, and later introduce user-photo virtual try-on with explicit confidence/limitations.
- Status: active.

### Data & Integration Log
- ID: ST-DATA-20261021-01
- Added fields: visual asset, model type, supported views, and future model target.
- Privacy rule: user-photo virtual try-on must use private per-user storage and must never be committed to the public repository.

### Decision Log
- ID: ST-DEC-20261021-01
- Decision: standardise Recommended Combination visuals around the approved dark lookbook composition and five-view mannequin presentation.
- Future decision gate: replace mannequin with user avatar only after private photo upload, consent, storage, and deletion controls are implemented.
- Status: implemented at UI/data-model level.


## 2026-10-22 — Real lookbook assets replace silhouette fallback

### Product / Feature Log
- ID: ST-PROD-20261022-01
- Change: Replaced the crude CSS mannequin fallback in Recommended Combinations with the approved multi-angle mannequin lookbook image assets.
- UX rule: if a real visual asset is unavailable, show a neutral generation/pending state rather than a fake body silhouette.

### System Log
- ID: ST-SYS-20261022-01
- Change: Added four compressed WebP lookbook assets under public/lookbooks and wired them through the visual-lookbook registry.
- Performance: assets were compressed for web delivery while retaining the approved five-view composition.

### Architecture Log
- ID: ST-ARCH-20261022-01
- Decision: add visual fidelity metadata to distinguish a style-preview render from a future exact-garment render and user-avatar render.
- Rationale: avoid implying that a generated lookbook is an exact representation of the user's owned garments when colour, cut or fabric details differ.

### Risk & Assumption Log
- ID: ST-RISK-20261022-01
- Risk: a polished mannequin preview can be mistaken for an exact digital twin of the wardrobe items.
- Mitigation: label current boards as Visual style preview and keep the actual owned item list visible beneath the render.
- Status: mitigated at UI level; exact-garment generation remains a planned fidelity upgrade.

### Data & Integration Log
- ID: ST-DATA-20261022-01
- Assets: city-minimal.webp, linen-earth.webp, coastal-blue.webp, olive-neutral.webp.
- Registry field: fidelity = style-preview.
- Next integration: exact-garment rendering should derive directly from each recommendation's owned item images before user-photo try-on is enabled.

### Decision Log
- ID: ST-DEC-20261022-01
- Decision: never use the CSS silhouette mannequin as a user-facing substitute for a missing render.
- Status: implemented.


## 2026-10-22 — GitHub Pages lookbook asset path fix

### System Log
- ID: ST-SYS-20261022-02
- Change: Exposed the deployment base path to client-side code and prefixed lookbook image URLs with it.
- Root cause: GitHub Pages serves the application under /STATIC-THREADS, while absolute /lookbooks/... URLs resolved against github.io root and returned 404.

### Risk & Assumption Log
- ID: ST-RISK-20261022-02
- Risk: future public assets can silently break when the app is deployed below a sub-path.
- Mitigation: use the shared NEXT_PUBLIC_BASE_PATH when constructing runtime public-asset URLs.
- Status: implemented.

### Decision Log
- ID: ST-DEC-20261022-02
- Decision: all runtime public assets must be base-path-aware rather than assuming root-domain deployment.
- Status: implemented.


## 2026-10-22 — Image integrity and wardrobe-photo truthfulness

### System Log
- ID: ST-SYS-20261022-03
- Root cause: the previous GitHub connector upload truncated large WebP payloads; deployed lookbook blobs were only 7.5–15 KB and were corrupt.
- Change: re-encoded the four lookbooks as compact WebP assets small enough for lossless connector transfer and replaced the corrupt blobs.

### Product / Feature Log
- ID: ST-PROD-20261022-02
- Change: generated catalogue illustrations are now explicitly labelled as placeholders in both the walk-in rail and wardrobe cards.
- Rationale: do not present derived vector illustrations as the user's original garment photography.

### Data & Integration Log
- ID: ST-DATA-20261022-02
- Historical source status: the July wardrobe photos informed the 26-item catalogue, but the original binary attachments are not currently recoverable through the project file context.
- Rule: only mark an image as original/cleaned-user-photo after a real source asset is connected.

### Decision Log
- ID: ST-DEC-20261022-03
- Decision: no generated catalogue illustration may be represented as an original wardrobe image.
- Status: implemented.


## 2026-10-22 — Refined high-quality Recommendation 03/04 lookbooks

### Product / Feature Log
- ID: ST-PROD-20261022-03
- Change: Replaced the lower-fidelity Recommendation 03 (Coastal Blue) and Recommendation 04 (Olive Neutral) mannequin boards with refined five-view renders.
- Views retained: Walking, Sitting, Front View, Back View, Side View.
- Visual intent: sharper garment texture, cleaner mannequin anatomy, clearer trouser drape, footwear, pose separation, and more consistent dark lookbook presentation.

### System Log
- ID: ST-SYS-20261022-04
- Change: Added a deterministic build-time lookbook reconstruction step before Next.js build/export.
- Build command: npm run build:lookbooks && next build.
- Validation: the build fails when decoded byte count differs from the approved asset or the reconstructed file does not contain valid RIFF/WEBP container headers.

### Architecture Log
- ID: ST-ARCH-20261022-02
- Decision: store refined binary lookbook assets as small base64 source chunks and reconstruct WebP files during CI/build.
- Rationale: the GitHub connector previously truncated larger binary transfers; chunked text is auditable and survives the connector reliably.

### Data & Integration Log
- ID: ST-DATA-20261022-03
- Coastal Blue approved reconstructed asset: 48,011 bytes, refined high-quality WebP.
- Olive Neutral approved reconstructed asset: 16,890 bytes, optimized WebP for recommendation-card delivery.
- Output paths remain public/lookbooks/coastal-blue.webp and public/lookbooks/olive-neutral.webp, so no recommendation component API change is required.

### Risk & Assumption Log
- ID: ST-RISK-20261022-03
- Risk: large generated image uploads can be silently truncated by repository tooling.
- Mitigation: source chunking + exact expected byte validation + WebP header validation on every application build.
- Residual risk: current renders remain style-preview visuals rather than exact digital twins of the user's owned garments.

### Decision Log
- ID: ST-DEC-20261022-04
- Decision: refined Recommendation 03/04 renders replace the current compressed boards while preserving the existing five-angle UX and style-preview disclosure.
- Status: implementation complete on feature branch; pending CI and deployment verification.
