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

- Supabase authentication and storage
- wardrobe item creation form
- outfit compatibility engine
- brand-specific size profile
- approved retailer and affiliate feed adapters
- scheduled sale matching backend
- web push and email notification delivery
- shopping URL analysis
- duplicate-purchase warning
- outfit and cost-per-wear insights
