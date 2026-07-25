"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { WardrobeCatalog } from "@/types/catalog";

interface WardrobeCatalogViewProps {
  catalog: WardrobeCatalog;
}

const ALL = "all";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function WardrobeCatalogView({ catalog }: WardrobeCatalogViewProps) {
  const [brand, setBrand] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [size, setSize] = useState(ALL);
  const [query, setQuery] = useState("");

  const brands = unique(catalog.items.map((item) => item.brand));
  const categories = unique(catalog.items.map((item) => item.category));
  const sizes = unique(catalog.items.map((item) => item.size));

  const filteredItems = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return catalog.items.filter((item) => {
      const searchable = [
        item.name,
        item.brand,
        item.category,
        item.subcategory,
        item.primaryColour,
        ...item.secondaryColours
      ]
        .join(" ")
        .toLowerCase();

      return (
        (brand === ALL || item.brand === brand) &&
        (category === ALL || item.category === category) &&
        (size === ALL || item.size === size) &&
        (!normalisedQuery || searchable.includes(normalisedQuery))
      );
    });
  }, [brand, catalog.items, category, query, size]);

  const availableCount = catalog.items.filter((item) => item.status === "available").length;
  const brandCount = unique(catalog.items.map((item) => item.brand)).length;
  const totalWearCount = catalog.items.reduce((total, item) => total + item.wearCount, 0);

  return (
    <section className="catalog-section" aria-labelledby="catalog-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Digital wardrobe</p>
          <h2 id="catalog-heading">My catalogue</h2>
        </div>
        <p>Updated {catalog.updatedAt}</p>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Total items</span>
          <strong>{catalog.items.length}</strong>
        </article>
        <article className="metric-card">
          <span>Available</span>
          <strong>{availableCount}</strong>
        </article>
        <article className="metric-card">
          <span>Brands</span>
          <strong>{brandCount}</strong>
        </article>
        <article className="metric-card">
          <span>Total wears</span>
          <strong>{totalWearCount}</strong>
        </article>
      </div>

      <div className="filter-panel">
        <label className="search-field">
          <span>Search wardrobe</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by item, colour or brand"
          />
        </label>

        <label>
          <span>Brand</span>
          <select value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value={ALL}>All brands</option>
            {brands.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value={ALL}>All categories</option>
            {categories.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Size</span>
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            <option value={ALL}>All sizes</option>
            {sizes.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredItems.length > 0 ? (
        <div className="catalog-grid">
          {filteredItems.map((item) => (
            <article className="item-card" key={item.id}>
              <div className="item-image-wrap">
                <Image
                  src={item.image}
                  alt={`${item.brand} ${item.name}`}
                  fill
                  sizes="(max-width: 720px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  className="item-image"
                />
              </div>
              <div className="item-content">
                <div className="item-title-row">
                  <div>
                    <p>{item.brand}</p>
                    <h3>{item.name}</h3>
                  </div>
                  <span className={`status status-${item.status}`}>{item.status}</span>
                </div>
                <dl className="item-details">
                  <div>
                    <dt>Size</dt>
                    <dd>{item.size}</dd>
                  </div>
                  <div>
                    <dt>Colour</dt>
                    <dd>{item.primaryColour}</dd>
                  </div>
                  <div>
                    <dt>Fit</dt>
                    <dd>{item.fit}</dd>
                  </div>
                  <div>
                    <dt>Worn</dt>
                    <dd>{item.wearCount} times</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      ) : catalog.items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">ST</div>
          <h3>Your catalogue is ready for its first item</h3>
          <p>
            Upload a clear clothing or shoe photograph. The approved product-only image and factual
            details will be added here without storing the original photo in the public repository.
          </p>
          <div className="empty-steps">
            <span>1. Upload</span>
            <span>2. Clean</span>
            <span>3. Confirm details</span>
            <span>4. Catalogue</span>
          </div>
        </div>
      ) : (
        <div className="empty-state compact">
          <h3>No items match these filters</h3>
          <p>Clear one or more filters to see the rest of your wardrobe.</p>
        </div>
      )}
    </section>
  );
}
