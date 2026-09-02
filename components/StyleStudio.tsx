import { shopSuggestions } from "@/data/shop-similar";
import { styleProfile } from "@/data/style-profile";
import type { WardrobeCatalog, WardrobeItem } from "@/types/catalog";

const colourMap: Record<string, string> = {
  white: "#f1efe7",
  black: "#17191c",
  cream: "#e8ddc4",
  navy: "#243049",
  taupe: "#81766d",
  "olive green": "#687153",
  lilac: "#aaa0ba",
  grey: "#777b7f",
  charcoal: "#45494d",
  beige: "#c7b697",
  blue: "#7892aa",
  "light grey": "#b1b6b8",
  brown: "#75523f"
};

function swatch(item: WardrobeItem) {
  return colourMap[item.primaryColour.toLowerCase()] ?? "#747a76";
}

export function StyleStudio({ catalog }: { catalog: WardrobeCatalog }) {
  const byId = new Map(catalog.items.map((item) => [item.id, item]));

  return (
    <section className="style-studio" id="style-studio" aria-labelledby="style-studio-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Personal style intelligence</p>
          <h2 id="style-studio-heading">Your style profile</h2>
        </div>
        <span className="style-score">{styleProfile.score}/100 fit</span>
      </div>

      <div className="style-profile-grid">
        <article className="style-profile-card">
          <p className="micro-label">Style DNA</p>
          <h3>{styleProfile.archetype}</h3>
          <p className="style-profile-copy">
            Built from the outfits you have shared and the pieces already in your wardrobe—not from demographic assumptions.
          </p>
          <div className="style-tags">
            {styleProfile.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="palette-row" aria-label="Preferred colour palette">
            {styleProfile.palette.map((colour) => (
              <div className="palette-chip" key={colour.name} title={colour.name}>
                <span style={{ background: colour.hex }} />
                <small>{colour.name}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="style-principles-card">
          <p className="micro-label">What consistently works</p>
          <div className="principle-list">
            {styleProfile.principles.map((principle) => (
              <div key={principle.title}>
                <strong>{principle.title}</strong>
                <p>{principle.body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="recommendation-heading">
        <div>
          <p className="micro-label">From your wardrobe</p>
          <h3>Recommended combinations</h3>
        </div>
        <p>Use what you already own before buying another piece.</p>
      </div>

      <div className="outfit-grid">
        {styleProfile.outfits.map((outfit) => {
          const items = outfit.itemIds.map((id) => byId.get(id)).filter((item): item is WardrobeItem => Boolean(item));
          return (
            <article className="outfit-card" key={outfit.id}>
              <div className="outfit-card-topline">
                <span>{outfit.score}% match</span>
                <small>{outfit.mood}</small>
              </div>
              <h3>{outfit.name}</h3>
              <div className="outfit-stack" aria-label={`${outfit.name} items`}>
                {items.map((item) => (
                  <div className="outfit-piece" key={item.id}>
                    <span className="outfit-piece-swatch" style={{ background: swatch(item) }} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.brand} · {item.primaryColour}</small>
                    </div>
                  </div>
                ))}
              </div>
              <p className="outfit-why">{outfit.why}</p>
            </article>
          );
        })}
      </div>

      <div className="recommendation-heading">
        <div>
          <p className="micro-label">Saved inspiration</p>
          <h3>Looks to recreate next</h3>
        </div>
        <p>These are style directions from your latest references. They are kept separate from wardrobe-owned combinations.</p>
      </div>

      <div className="outfit-grid">
        {styleProfile.inspirationLooks.map((look) => (
          <article className="outfit-card" key={look.id}>
            <div className="outfit-card-topline">
              <span>Inspiration</span>
              <small>{look.mood}</small>
            </div>
            <h3>{look.name}</h3>
            <div className="outfit-stack" aria-label={`${look.name} pieces`}>
              {look.pieces.map((piece) => (
                <div className="outfit-piece" key={piece}>
                  <span className="outfit-piece-swatch" />
                  <div>
                    <strong>{piece}</strong>
                    <small>Target combination</small>
                  </div>
                </div>
              ))}
            </div>
            <p className="outfit-why">{look.why}</p>
          </article>
        ))}
      </div>

      <div className="recommendation-heading shop-heading" id="shop-similar">
        <div>
          <p className="micro-label">Current retailer matches</p>
          <h3>Shop similar, not random</h3>
        </div>
        <p>Prioritised by how naturally each piece extends your existing combinations.</p>
      </div>

      <div className="shop-grid">
        {shopSuggestions.map((suggestion) => (
          <article className="shop-card" key={suggestion.id}>
            <div className="shop-card-head">
              <span className="retailer-pill">{suggestion.retailer}</span>
              <strong>{suggestion.match}% match</strong>
            </div>

            {suggestion.imageUrl ? (
              <a href={suggestion.href} target="_blank" rel="noreferrer" aria-label={`Open ${suggestion.name} at ${suggestion.retailer}`}>
                <div
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                    aspectRatio: "4 / 5",
                    borderRadius: "16px",
                    background: "#f4f1ea",
                    marginBottom: "14px"
                  }}
                >
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.imageAlt ?? `${suggestion.name} from ${suggestion.retailer}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      bottom: "10px",
                      padding: "6px 9px",
                      borderRadius: "999px",
                      background: "rgba(8,11,13,.82)",
                      color: "#f4f6f2",
                      fontSize: ".68rem",
                      fontWeight: 800,
                      backdropFilter: "blur(10px)"
                    }}
                  >
                    Live product image
                  </span>
                </div>
              </a>
            ) : (
              <div className="shop-product-visual" aria-label={`${suggestion.retailer} product preview unavailable`}>
                <span>{suggestion.category}</span>
                <b>{suggestion.colour}</b>
                <small style={{ marginTop: "8px", opacity: 0.72 }}>Retailer image feed pending</small>
              </div>
            )}

            <h3>{suggestion.name}</h3>
            <p className="shop-price">{suggestion.priceLabel}</p>
            {suggestion.sale ? <p className="sale-note">{suggestion.sale}</p> : null}
            {suggestion.availability ? <p className="sale-note">{suggestion.availability}</p> : null}
            <p className="shop-reason">{suggestion.reason}</p>
            <div className="pairing-row">
              <span>Pairs with</span>
              <div>{suggestion.pairsWith.slice(0, 3).map((id) => <small key={id}>{byId.get(id)?.name ?? id}</small>)}</div>
            </div>
            {suggestion.productCode ? <small className="checked-at">Product code: {suggestion.productCode}</small> : null}
            <a href={suggestion.href} target="_blank" rel="noreferrer" className="shop-link">
              {suggestion.sourceType === "product" ? "View current product" : "Browse matching range"}
              <span aria-hidden="true">↗</span>
            </a>
            <small className="checked-at">Checked {suggestion.checkedAt}. Price, stock and retailer imagery may change.</small>
          </article>
        ))}
      </div>
    </section>
  );
}
