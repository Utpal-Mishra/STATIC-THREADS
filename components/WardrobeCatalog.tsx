"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { WardrobeCatalog, WardrobeItem } from "@/types/catalog";

interface WardrobeCatalogViewProps {
  catalog: WardrobeCatalog;
}

const ALL = "all";
const groupOrder = ["T-Shirts & Tops", "Shirts", "Overshirts & Jackets", "Bottoms", "Shoes", "Caps & Accessories"];

const colourMap: Record<string, string> = {
  white: "#f5f3eb",
  black: "#181a1d",
  cream: "#e9dfc6",
  navy: "#18243b",
  taupe: "#81766d",
  "olive green": "#65704e",
  lilac: "#aea3bd",
  grey: "#73777c",
  charcoal: "#3e4247",
  beige: "#c9b99d",
  blue: "#8097ab",
  "light grey": "#aeb3b7",
  brown: "#795642"
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function groupFor(item: WardrobeItem): string {
  if (item.category === "tops") return "T-Shirts & Tops";
  if (item.category === "shirts") return "Shirts";
  if (item.category === "jackets" || item.category === "knitwear") return "Overshirts & Jackets";
  if (["trousers", "jeans", "shorts"].includes(item.category)) return "Bottoms";
  if (item.category === "shoes") return "Shoes";
  return "Caps & Accessories";
}

function productIllustration(item: WardrobeItem): string {
  const fill = colourMap[item.primaryColour.toLowerCase()] ?? "#7b817d";
  const accent = item.secondaryColours.length > 0
    ? colourMap[item.secondaryColours[0].toLowerCase()] ?? "#d4d4d4"
    : "#d7d9d5";
  const isBottom = ["trousers", "jeans", "shorts"].includes(item.category);
  const isShoe = item.category === "shoes";
  const isCap = item.category === "accessories";

  const shape = isBottom
    ? `<path d="M112 48h96l-6 63-19 123h-38l-5-90-5 90H97L78 111 72 48z" fill="${fill}"/><path d="M84 71h112" stroke="${accent}" stroke-width="3" opacity=".55"/>`
    : isShoe
      ? `<path d="M47 151c23 3 42-13 55-40l39 16c18 8 32 19 54 22 18 2 31 8 31 25 0 15-12 24-31 24H66c-27 0-38-12-38-27 0-13 8-21 19-20z" fill="${fill}"/><path d="M77 144l72 0" stroke="${accent}" stroke-width="10"/><path d="M45 183h174" stroke="#d8d4c9" stroke-width="11"/>`
      : isCap
        ? `<path d="M74 139c0-48 27-82 66-82s66 34 66 82H74z" fill="${fill}"/><path d="M78 139h138c22 0 35 7 35 18 0 14-18 22-47 22H82c-22 0-35-8-35-20 0-11 11-18 31-20z" fill="${fill}"/><path d="M140 60v78" stroke="${accent}" stroke-width="3" opacity=".45"/>`
        : `<path d="M91 54l34-18h30l34 18 45 27-20 42-29-15v124H95V108l-29 15-20-42z" fill="${fill}"/><path d="M125 36c0 17 8 26 15 26s15-9 15-26" fill="none" stroke="${accent}" stroke-width="4"/><path d="M140 66v154" stroke="${accent}" stroke-width="3" opacity=".5"/>${item.subcategory.includes("pocket") || item.subcategory.includes("overshirt") ? `<rect x="151" y="101" width="29" height="30" rx="3" fill="${accent}" opacity=".7"/>` : ""}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6f3eb"/><stop offset="1" stop-color="#ddd8ce"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".2"/></filter></defs><rect width="280" height="280" rx="28" fill="url(#bg)"/><g filter="url(#s)">${shape}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function WardrobeCatalogView({ catalog }: WardrobeCatalogViewProps) {
  const [brand, setBrand] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [size, setSize] = useState(ALL);
  const [query, setQuery] = useState("");
  const [activeClosetIndex, setActiveClosetIndex] = useState<number | null>(null);
  const [closetPan, setClosetPan] = useState(0);

  const brands = unique(catalog.items.map((item) => item.brand));
  const categories = unique(catalog.items.map((item) => item.category));
  const sizes = unique(catalog.items.map((item) => item.size));

  const filteredItems = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return catalog.items.filter((item) => {
      const searchable = [item.name, item.brand, item.category, item.subcategory, item.primaryColour, ...item.secondaryColours].join(" ").toLowerCase();
      return (brand === ALL || item.brand === brand) && (category === ALL || item.category === category) && (size === ALL || item.size === size) && (!normalisedQuery || searchable.includes(normalisedQuery));
    });
  }, [brand, catalog.items, category, query, size]);

  const grouped = groupOrder.map((group) => ({ group, items: filteredItems.filter((item) => groupFor(item) === group) })).filter(({ items }) => items.length > 0);
  const availableCount = catalog.items.filter((item) => item.status === "available").length;
  const brandCount = unique(catalog.items.map((item) => item.brand)).length;
  const closetItems = catalog.items.filter((item) => !["shoes", "accessories"].includes(item.category)).slice(0, 12);
  const activeClosetItem = activeClosetIndex === null ? null : closetItems[activeClosetIndex] ?? null;

  function stepCloset(direction: -1 | 1) {
    setActiveClosetIndex((current) => {
      if (closetItems.length === 0) return null;
      if (current === null) return direction > 0 ? 0 : closetItems.length - 1;
      return (current + direction + closetItems.length) % closetItems.length;
    });
  }

  function updateClosetPan(clientX: number, left: number, width: number) {
    if (width <= 0) return;
    const relative = Math.max(0, Math.min(1, (clientX - left) / width));
    setClosetPan((relative - 0.5) * 2);
  }

  return (
    <section className="catalog-section" aria-labelledby="catalog-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Digital wardrobe</p><h2 id="catalog-heading">My closet</h2></div>
        <p>Updated {catalog.updatedAt}</p>
      </div>

      <div className="closet-stage" aria-label="Interactive wardrobe rail">
        <div className="closet-copy">
          <p className="micro-label">Walk-in closet</p>
          <h3>Move through your wardrobe.</h3>
          <p>Hover, focus or tap a hanger. The selected piece steps forward while the rail makes space around it.</p>
        </div>
        <div
          className="closet-scene"
          style={{ "--closet-pan": closetPan } as CSSProperties}
          onPointerMove={(event) => {
            if (event.pointerType === "touch") return;
            const bounds = event.currentTarget.getBoundingClientRect();
            updateClosetPan(event.clientX, bounds.left, bounds.width);
          }}
          onPointerLeave={() => setClosetPan(0)}
        >
          <div className="closet-back-wall" aria-hidden="true" />
          <div className="closet-glow" aria-hidden="true" />
          <div className="closet-rail" aria-hidden="true" />
          <div
            className={`closet-rack ${activeClosetIndex !== null ? "has-active" : ""}`}
            onMouseLeave={() => setActiveClosetIndex(null)}
          >
            {closetItems.map((item, index) => {
              const distance = activeClosetIndex === null ? 0 : Math.abs(index - activeClosetIndex);
              const direction = activeClosetIndex === null || index === activeClosetIndex ? 0 : index < activeClosetIndex ? -1 : 1;
              const style = {
                "--closet-distance": distance,
                "--closet-direction": direction
              } as CSSProperties;
              return (
                <button
                  type="button"
                  className={`closet-garment ${activeClosetIndex === index ? "is-active" : ""}`}
                  key={item.id}
                  style={style}
                  onMouseEnter={() => setActiveClosetIndex(index)}
                  onFocus={() => setActiveClosetIndex(index)}
                  onBlur={() => setActiveClosetIndex(null)}
                  onClick={() => setActiveClosetIndex(activeClosetIndex === index ? null : index)}
                  aria-label={`${item.brand} ${item.name}, ${item.primaryColour}`}
                >
                  <span className="closet-hanger" aria-hidden="true" />
                  <span className="closet-card">
                    <img src={productIllustration(item)} alt="" />
                    {item.image.startsWith("embedded:") ? <span className="catalog-source-badge">Placeholder</span> : null}
                    <span className="closet-label">
                      <strong>{item.name}</strong>
                      <small>{item.brand} · {item.primaryColour}</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="closet-floor-shadow" aria-hidden="true" />
          <div className="closet-controls" aria-label="Walk through wardrobe">
            <button type="button" onClick={() => stepCloset(-1)} aria-label="Previous garment">←</button>
            <span>{activeClosetIndex === null ? "Walk the rail" : `${activeClosetIndex + 1} / ${closetItems.length}`}</span>
            <button type="button" onClick={() => stepCloset(1)} aria-label="Next garment">→</button>
          </div>
          <aside className={`closet-inspector ${activeClosetItem ? "is-visible" : ""}`} aria-live="polite">
            {activeClosetItem ? (
              <>
                <span className="closet-inspector-kicker">Selected from your rail</span>
                <strong>{activeClosetItem.name}</strong>
                <small>{activeClosetItem.brand} · {activeClosetItem.primaryColour} · {activeClosetItem.fit}</small>
              </>
            ) : (
              <>
                <span className="closet-inspector-kicker">Interactive closet</span>
                <strong>Hover or use the arrows</strong>
                <small>Move left ↔ right to create depth across the rail.</small>
              </>
            )}
          </aside>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card"><span>Total items</span><strong>{catalog.items.length}</strong></article>
        <article className="metric-card"><span>Available</span><strong>{availableCount}</strong></article>
        <article className="metric-card"><span>Brands</span><strong>{brandCount}</strong></article>
        <article className="metric-card"><span>Sections</span><strong>{groupOrder.length}</strong></article>
      </div>

      <div className="filter-panel">
        <label className="search-field"><span>Search wardrobe</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by item, colour or brand" /></label>
        <label><span>Brand</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value={ALL}>All brands</option>{brands.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value={ALL}>All categories</option>{categories.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label><span>Size</span><select value={size} onChange={(event) => setSize(event.target.value)}><option value={ALL}>All sizes</option>{sizes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      </div>

      {grouped.length > 0 ? grouped.map(({ group, items }) => (
        <section className="wardrobe-group" key={group}>
          <div className="wardrobe-group-heading"><h3>{group}</h3><span>{items.length} items</span></div>
          <div className="catalog-grid">
            {items.map((item) => (
              <article className="item-card" key={item.id}>
                <div className="item-image-wrap">
                  <img src={productIllustration(item)} alt={`${item.brand} ${item.name} generated catalogue placeholder`} className="item-image" />
                  {item.image.startsWith("embedded:") ? <span className="catalog-source-badge">Generated placeholder · original photo not connected</span> : null}
                </div>
                <div className="item-content">
                  <div className="item-title-row"><div><p>{item.brand}</p><h3>{item.name}</h3></div><span className={`status status-${item.status}`}>{item.status}</span></div>
                  <dl className="item-details"><div><dt>Size</dt><dd>{item.size}</dd></div><div><dt>Colour</dt><dd>{item.primaryColour}</dd></div><div><dt>Fit</dt><dd>{item.fit}</dd></div><div><dt>Type</dt><dd>{item.subcategory}</dd></div></dl>
                </div>
              </article>
            ))}
          </div>
        </section>
      )) : <div className="empty-state compact"><h3>No items match these filters</h3><p>Clear one or more filters to see the rest of your wardrobe.</p></div>}
    </section>
  );
}
