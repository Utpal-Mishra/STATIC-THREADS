import { shopSuggestions } from "@/data/shop-similar";
import { styleProfile } from "@/data/style-profile";
import { visualLookbooks, type VisualLookbookId } from "@/data/lookbook-visuals";
import inspirationImageSets from "@/data/inspiration-image-sets.json";
import type { RecommendationColourVariant } from "@/data/recommendation-colour-variants";
import { RecommendationCard } from "@/components/RecommendationCard";
import type { WardrobeCatalog, WardrobeItem } from "@/types/catalog";

export function StyleStudio({ catalog }: { catalog: WardrobeCatalog }) {
  const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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
          if (!(outfit.id in visualLookbooks)) return null;
          const visual = visualLookbooks[outfit.id as VisualLookbookId];

          return (
            <RecommendationCard
              key={outfit.id}
              outfit={outfit}
              items={items}
              visual={visual}
              publicBasePath={publicBasePath}
            />
          );
        })}
      </div>

      <div className="recommendation-heading" id="saved-inspiration">
        <div>
          <p className="micro-label">Saved inspiration</p>
          <h3>Looks to recreate next</h3>
        </div>
        <p>These are style directions from your latest references. They are kept separate from wardrobe-owned combinations.</p>
      </div>

      <div className="outfit-grid">
        {styleProfile.inspirationLooks.map((look) => (
          <RecommendationCard
            key={look.id}
            outfit={look}
            items={[]}
            inspirationPieces={look.pieces}
            imageVariants={inspirationImageSets[look.id] as unknown as RecommendationColourVariant[]}
            visual={{ asset: inspirationImageSets[look.id][0].asset, views: ["Walking", "Sitting", "Front View", "Back View", "Side View"] }}
            publicBasePath={publicBasePath}
          />
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
