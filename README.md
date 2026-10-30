# Static Threads

Static Threads is a mobile-first digital wardrobe, outfit-planning and purchase-intelligence application.

It helps users understand what they own, discover new outfit combinations, maintain brand-specific sizing profiles, and evaluate whether a potential purchase genuinely improves their wardrobe.

## Current foundation

The first development foundation includes:

- a minimal dark Next.js interface with restrained colour accents;
- a responsive wardrobe catalogue;
- a structured wardrobe catalogue schema;
- brand, size, category, colour and status filters;
- a Python image-cleaning pipeline for product-only catalogue images;
- privacy controls that exclude original photographs from Git;
- a sale-radar preference interface for brand, size, discount, price and retailer matching;
- planned coverage for direct brand stores and multi-brand retailers such as JD Sports, Sports Direct and NEXT;
- browser notification permission and device-local preference storage;
- catalogue contribution and naming guidance;
- automated frontend and Python validation through GitHub Actions;
- GitHub Pages static deployment configuration.

## Sale radar status

The current application can store sale preferences, automatically inherit brands and sizes from the wardrobe catalogue, and request browser notification permission.

Live product prices, stock checks and scheduled alerts are not connected yet. They require approved retailer or affiliate feeds plus a secure backend matching service. The interface marks this status clearly rather than presenting sample data as live offers.

See [`docs/SALE_MONITORING.md`](docs/SALE_MONITORING.md) for the matching rules, retailer adapter design and implementation phases.

## Core workflow

1. Add clothing or shoe photographs to a private local input folder.
2. Run the catalogue image-cleaning script.
3. Review the cleaned, product-only result.
4. Add the approved image and item metadata to the catalogue.
5. Update the catalogue, README and changelog on an `agent/*` branch.
6. Review and merge the draft pull request into `main`.
7. GitHub Actions validates and deploys the static application.

## Privacy principle

This is a public repository. Original wardrobe photographs must not be committed. Only user-approved, product-only cleaned images should be stored under `public/catalog/`.

## Technology

- Next.js and TypeScript
- Responsive dark-theme CSS
- JSON-backed MVP catalogue
- Device-local sale preference storage
- Browser Notification API for permission and test notifications
- Python, Pillow and optional `rembg` image processing
- GitHub Actions and GitHub Pages

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Image processing

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-image.txt
python scripts/process_catalog_image.py \
  --input private/originals/item-photo.jpg \
  --output public/catalog/item-id.webp \
  --remove-background
```

See [`docs/CATALOG_WORKFLOW.md`](docs/CATALOG_WORKFLOW.md) for the full upload and review process.

## Repository structure

```text
app/                     Next.js application
components/              Reusable interface components
data/catalog.json        Wardrobe catalogue records
docs/                    Product and contribution guidance
public/catalog/          Approved cleaned product images only
scripts/                 Image-processing and validation tools
types/                   Shared catalogue types
```

## Planned next steps

- Private wardrobe cloud storage (authentication lifecycle implemented; production setup/acceptance pending)
- wardrobe item creation form
- outfit compatibility engine
- brand-specific size profile
- approved retailer and affiliate feed adapters
- scheduled sale matching backend
- web push and email notification delivery
- shopping URL analysis
- duplicate-purchase warning
- outfit and cost-per-wear insights

## Complete outfit image presets

Each recommendation has four complete high-quality outfit boards, with five views per board. The first board restores the user-approved original. The other three are independently generated from that reference with a coordinated clothing palette and matching original footwear.

- `data/recommendation-image-sets.json` contains the 16 asset records, palette labels, native dimensions, five frame windows and integrity hashes.
- `RecommendationCard` selects a complete board after preloading/decoding it. The previous look remains visible during loading or a failed request; the latest selection wins during rapid toggling.
- `RecommendationLookbook` uses aspect-preserving SVG view windows onto the unchanged board. It does not stretch the mannequin, repaint pixels, or adjust image contrast/saturation.
- `public/lookbooks/collections/v1/` contains full-resolution lossless WebP assets. Decoded RGB pixels are identical to the corresponding original or generated PNG.
- Owned item metadata stays separate from the rendered inspiration palette.

Run `python scripts/validate_image_sets.py` to verify all 16 boards and 80 frame windows, including decoded pixel and file integrity. CI and deployment run this check.

The earlier mask/recolour files remain only as historical tooling. They are not imported by the live recommendation components or used in the deployment image path.

Saved inspiration uses `data/inspiration-image-sets.json`: eight style directions, three complete generated looks each and five poses per image. These are inspiration pieces, not owned inventory. All boards are lossless WebP under `public/lookbooks/inspiration/v1/`; palette changes swap the full image and update the piece list through the shared recommendation card.

Mobile navigation uses `components/MobileDock.tsx` below 681px: six direct links in one floating island — Style, Decide, Wardrobe, Similar, Radar and Account. The island remains available on the Account page with Account highlighted; section links return to the homepage. Desktop header labels remain unchanged. Safe-area insets and page bottom padding protect content from the fixed dock. The old mobile modal and duplicate Account shortcut have been removed.


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

### Account authentication

Email magic-link sign-in now includes PKCE callback completion, persisted/refreshed sessions, server-verified account identity, cross-tab updates and browser-scoped logout. The existing account design and public demo remain available. Personal wardrobe storage is a separate integration. See [account setup and verification](docs/ACCOUNT_AUTH.md).
