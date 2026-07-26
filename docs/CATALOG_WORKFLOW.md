# Catalogue Workflow

This workflow keeps Static Threads practical, consistent and privacy-aware.

## 1. Photograph an item

Use one item per photograph whenever possible.

Recommended capture conditions:

- place the clothing or shoe item against a plain contrasting background;
- use natural, even light;
- keep the full product inside the frame;
- avoid hands, faces, mirrors, receipts and personal surroundings;
- photograph the front as the primary catalogue image;
- provide labels or alternate angles separately when they are needed to confirm brand, size or material.

## 2. Keep the original private

Original photographs belong in a local folder such as:

```text
private/originals/
```

The `private/` and `originals/` folders are ignored by Git and must never be committed.

## 3. Clean the primary image

Install the processing environment:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-image.txt
```

Create the product-only image:

```bash
python scripts/process_catalog_image.py \
  --input private/originals/zara-green-overshirt.jpg \
  --output public/catalog/zara-green-overshirt-001.webp \
  --remove-background
```

The script:

- corrects image orientation;
- removes the background when requested;
- crops unused transparent space;
- centres the main item on a consistent square canvas;
- exports an optimised 1600 × 1600 WebP image.

Review every result before publishing it. Background removal can occasionally remove fine laces, straps, fringes or fabric edges.

## 4. Create the item record

Add the item to `data/catalog.json` using confirmed details only.

```json
{
  "id": "zara-green-overshirt-001",
  "name": "Dark Green Overshirt",
  "brand": "Zara",
  "category": "shirts",
  "subcategory": "overshirt",
  "size": "M",
  "fit": "relaxed",
  "primaryColour": "dark green",
  "secondaryColours": [],
  "pattern": "solid",
  "material": "cotton",
  "seasons": ["spring", "autumn"],
  "occasions": ["casual", "smart-casual"],
  "image": "/catalog/zara-green-overshirt-001.webp",
  "status": "available",
  "purchasePrice": 49.95,
  "currency": "EUR",
  "wearCount": 0,
  "notes": ""
}
```

Do not guess brand, size, fabric, price or purchase date. Use `unknown` only where the catalogue type permits it, or omit optional fields.

## 5. Naming convention

Use lowercase kebab-case:

```text
<brand>-<colour>-<item>-<sequence>.webp
```

Examples:

```text
zara-green-overshirt-001.webp
hm-black-jeans-001.webp
next-white-trainers-001.webp
```

The catalogue `id` should match the image filename without `.webp`.

## 6. Validate

```bash
python scripts/validate_catalog.py
npm run typecheck
npm run build
```

## 7. Commit and review

For each catalogue batch:

1. create or reuse a focused `agent/*` branch;
2. add only approved cleaned images;
3. update `data/catalog.json`;
4. update `CHANGELOG.md`;
5. validate the catalogue and application;
6. open or update the draft pull request.

## Information to provide with each future upload

For each item, provide what is known:

- brand;
- displayed size;
- clothing or shoe category;
- preferred item name;
- purchase price and date, when useful;
- fit assessment;
- whether the item is currently available, in laundry, stored or under repair.

When details are visible on a product label, upload the label as a supporting image. Only the cleaned primary product image will be published in the catalogue unless another image is specifically approved.
