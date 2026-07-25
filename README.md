# Static Threads

Static Threads is a mobile-first digital wardrobe, outfit-planning and purchase-intelligence application.

It helps users understand what they own, discover new outfit combinations, maintain brand-specific sizing profiles, and evaluate whether a potential purchase genuinely improves their wardrobe.

## Current foundation

The first development foundation includes:

- a responsive Next.js catalogue interface;
- a structured wardrobe catalogue schema;
- brand, size, category, colour and status filters;
- a Python image-cleaning pipeline for product-only catalogue images;
- privacy controls that exclude original photographs from Git;
- catalogue contribution and naming guidance;
- automated frontend and Python validation through GitHub Actions.

## Core workflow

1. Add clothing or shoe photographs to a private local input folder.
2. Run the catalogue image-cleaning script.
3. Review the cleaned, product-only result.
4. Add the approved image and item metadata to the catalogue.
5. Update the catalogue, README and changelog on an `agent/*` branch.
6. Review and merge the draft pull request into `main`.

## Privacy principle

This is a public repository. Original wardrobe photographs must not be committed. Only user-approved, product-only cleaned images should be stored under `public/catalog/`.

## Technology

- Next.js and TypeScript
- Responsive CSS
- JSON-backed MVP catalogue
- Python, Pillow and optional `rembg` image processing
- GitHub Actions

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
- shopping URL analysis
- duplicate-purchase warning
- outfit and cost-per-wear insights
