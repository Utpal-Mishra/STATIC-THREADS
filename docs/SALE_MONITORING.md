# Sale monitoring architecture

Static Threads should notify a user only when a discounted product is relevant to their wardrobe, fit profile and budget.

## Matching rule

A product offer is eligible for notification when it satisfies the user's saved conditions:

1. the product brand is selected or already represented in the wardrobe;
2. the retailer carries the user's saved size for that brand and category;
3. the discount meets the minimum threshold;
4. the final price is within budget;
5. the product is not a high-confidence duplicate of an owned item;
6. the product creates useful outfit combinations with existing items.

The eventual notification should explain why the offer was selected, for example:

```text
Nike trainer at JD Sports
30% off · €84
Your saved size: UK 9
Works with 8 wardrobe items
Duplicate risk: low
```

## Retailer coverage

The monitoring layer should support two source types:

- direct brand stores, for brand-specific releases, stock and promotions;
- multi-brand retailers, including JD Sports, Sports Direct and NEXT, where the same brand may be discounted outside its own store.

Each retailer requires an independent adapter because product identifiers, categories, sizes, price fields and availability formats differ.

```text
Retailer adapter
├── DirectBrandAdapter
├── JDSportsAdapter
├── SportsDirectAdapter
└── NextAdapter
```

Each adapter should return the same internal offer format:

```json
{
  "retailer": "JD Sports",
  "brand": "Nike",
  "productName": "Example trainer",
  "category": "shoes",
  "sizes": ["UK 8", "UK 9", "UK 10"],
  "originalPrice": 120,
  "salePrice": 84,
  "currency": "EUR",
  "discountPercent": 30,
  "availability": true,
  "productUrl": "https://example.com/product",
  "imageUrl": "https://example.com/image.webp",
  "checkedAt": "2026-07-25T18:00:00Z"
}
```

## Safe integration order

### Phase 1 — preference interface

Implemented in the current application:

- sale alert enable or pause control;
- minimum discount;
- maximum product price;
- retailer selection;
- browser notification permission;
- automatic use of wardrobe brands and sizes when items exist;
- local persistence of preferences.

This phase does not claim live retailer monitoring.

### Phase 2 — permitted retailer data

Use approved options in this order:

1. official retailer or partner APIs;
2. authorised affiliate product feeds;
3. retailer-provided structured feeds;
4. user-shared product URLs for on-demand analysis.

Do not build fragile or unauthorised high-frequency scraping into the production application.

### Phase 3 — scheduled matching service

A server-side scheduled task should:

1. retrieve changed offers from connected retailer adapters;
2. normalise brand, category, size and currency fields;
3. compare offers with saved user preferences;
4. calculate outfit value and duplicate risk;
5. suppress repeated notifications;
6. queue only eligible alerts.

GitHub Pages can host the static interface but cannot securely run this personalised background service by itself. The live monitoring service will require a backend, database and notification provider.

### Phase 4 — notifications

Recommended channels:

- web push for immediate alerts;
- email digest for lower-priority matches;
- in-app sale inbox for history and comparison.

## Notification quality controls

- one notification per product and meaningful price change;
- cooldown after dismissal;
- no alert when the saved size is unavailable;
- no alert for a high-confidence duplicate;
- configurable retailer, brand, category and price filters;
- clear source retailer and last-checked time;
- direct link to the original retailer product page;
- no automated purchase action.

## Current status

The current frontend stores sale preferences and can request browser notification permission. Live prices, stock checks and scheduled notifications are intentionally marked as pending until approved data feeds and a backend service are connected.
