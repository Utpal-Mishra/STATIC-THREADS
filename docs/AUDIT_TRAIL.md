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
