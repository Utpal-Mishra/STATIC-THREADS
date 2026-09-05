"use client";

import { useMemo, useState } from "react";
import { shopSuggestions } from "@/data/shop-similar";
import { styleProfile } from "@/data/style-profile";
import type { WardrobeCatalog, WardrobeItem } from "@/types/catalog";

const OCCASIONS = ["Office", "Weekend", "Dinner", "Travel", "Date", "Casual"] as const;
type OccasionLabel = (typeof OCCASIONS)[number];

const outfitPreference: Record<OccasionLabel, string[]> = {
  Office: ["city-minimal", "layered-neutral"],
  Weekend: ["weekend-ease", "utility-travel", "layered-neutral"],
  Dinner: ["city-minimal", "layered-neutral"],
  Travel: ["utility-travel", "weekend-ease", "layered-neutral"],
  Date: ["city-minimal", "layered-neutral"],
  Casual: ["weekend-ease", "utility-travel", "layered-neutral"]
};

function duplicateRisk(catalog: WardrobeCatalog, category: string, colour: string) {
  const normalizedCategory = category.replace("shirt", "shirts").replace("trousers", "trousers").replace("shorts", "shorts");
  const targetColours = colour.toLowerCase().split(/\s*\/\s*|\s+or\s+/);
  const similar = catalog.items.filter((item) => {
    const categoryHit = item.category === normalizedCategory || item.subcategory.toLowerCase().includes(category.replace("overshirt", "shirt"));
    const colourHit = targetColours.some((tone) => item.primaryColour.toLowerCase().includes(tone.trim()));
    return categoryHit && colourHit;
  });
  return Math.min(100, similar.length * 32);
}

function parseEuro(priceLabel: string) {
  const match = priceLabel.match(/€\s?([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

function wardrobeValue(match: number, pairCount: number, duplicate: number, price: number | null) {
  const newOutfits = Math.max(1, Math.round(pairCount * (1 + match / 100) - duplicate / 35));
  const utility = Math.round(Math.max(0, Math.min(100, match * 0.58 + Math.min(pairCount * 9, 27) - duplicate * 0.28 + (price && price <= 40 ? 7 : 0))));
  const costPerOutfit = price ? price / newOutfits : null;
  return { newOutfits, utility, costPerOutfit };
}

function verdict(score: number, duplicate: number, price: number | null) {
  if (score >= 82 && duplicate < 45) return { label: "BUY", tone: "buy", copy: "Adds useful combinations without strongly duplicating what you already own." };
  if (score >= 68 || (price && price > 60)) return { label: "WAIT", tone: "wait", copy: "Good fit, but wait for a better price or confirm it unlocks enough new outfits." };
  return { label: "SKIP", tone: "skip", copy: "Your wardrobe already covers most of this job, so the marginal value is limited." };
}

function itemLabel(item: WardrobeItem | undefined) {
  return item ? `${item.name} · ${item.primaryColour}` : "Wardrobe item";
}

export function DecisionLab({ catalog }: { catalog: WardrobeCatalog }) {
  const [occasion, setOccasion] = useState<OccasionLabel>("Office");
  const [lockedItemId, setLockedItemId] = useState("none");
  const [productId, setProductId] = useState(shopSuggestions[0]?.id ?? "");
  const byId = useMemo(() => new Map(catalog.items.map((item) => [item.id, item])), [catalog.items]);

  const outfit = useMemo(() => {
    const preferred = outfitPreference[occasion];
    const candidates = styleProfile.outfits.filter((entry) => preferred.includes(entry.id));
    if (lockedItemId === "none") return candidates[0] ?? styleProfile.outfits[0];
    return candidates.find((entry) => entry.itemIds.includes(lockedItemId))
      ?? styleProfile.outfits.find((entry) => entry.itemIds.includes(lockedItemId))
      ?? candidates[0]
      ?? styleProfile.outfits[0];
  }, [occasion, lockedItemId]);

  const suggestion = shopSuggestions.find((entry) => entry.id === productId) ?? shopSuggestions[0];
  const duplicate = suggestion ? duplicateRisk(catalog, suggestion.category, suggestion.colour) : 0;
  const price = suggestion ? parseEuro(suggestion.priceLabel) : null;
  const value = suggestion ? wardrobeValue(suggestion.match, suggestion.pairsWith.length, duplicate, price) : null;
  const decision = value ? verdict(value.utility, duplicate, price) : null;

  return (
    <section className="decision-lab" id="decision-lab" aria-labelledby="decision-lab-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Next iteration · Decision support</p>
          <h2 id="decision-lab-heading">Dress first. Buy second.</h2>
        </div>
        <p className="decision-lab-intro">Two market-facing workflows: choose an outfit from what you own, then test whether a new product genuinely improves the wardrobe.</p>
      </div>

      <div className="decision-lab-grid">
        <article className="decision-panel">
          <div className="decision-panel-head">
            <div>
              <p className="micro-label">What should I wear?</p>
              <h3>{occasion} recommendation</h3>
            </div>
            <span className="decision-score">{outfit.score}%</span>
          </div>

          <div className="decision-controls">
            <label>
              <span>Occasion</span>
              <select value={occasion} onChange={(event) => setOccasion(event.target.value as OccasionLabel)}>
                {OCCASIONS.map((label) => <option key={label}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Build around</span>
              <select value={lockedItemId} onChange={(event) => setLockedItemId(event.target.value)}>
                <option value="none">Choose for me</option>
                {catalog.items.filter((item) => item.status === "available").map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="decision-outfit-list">
            {outfit.itemIds.map((id) => {
              const item = byId.get(id);
              return (
                <div key={id} className="decision-outfit-item">
                  <span className="decision-dot" />
                  <div><strong>{item?.name ?? id}</strong><small>{item ? `${item.brand} · ${item.primaryColour}` : "Wardrobe match"}</small></div>
                </div>
              );
            })}
          </div>
          <p className="decision-explanation">{outfit.why}</p>
          <div className="decision-actions"><button type="button" onClick={() => setLockedItemId("none")}>Give me another direction</button><span>{outfit.mood}</span></div>
        </article>

        {suggestion && value && decision ? (
          <article className="decision-panel purchase-panel">
            <div className="decision-panel-head">
              <div>
                <p className="micro-label">Product check</p>
                <h3>Marginal wardrobe value</h3>
              </div>
              <span className={`purchase-verdict ${decision.tone}`}>{decision.label}</span>
            </div>

            <label className="product-select">
              <span>Evaluate retailer product</span>
              <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                {shopSuggestions.map((entry) => <option key={entry.id} value={entry.id}>{entry.retailer} · {entry.name}</option>)}
              </select>
            </label>

            <div className="value-metrics">
              <div><span>Wardrobe fit</span><strong>{suggestion.match}%</strong></div>
              <div><span>Utility score</span><strong>{value.utility}/100</strong></div>
              <div><span>Estimated new outfits</span><strong>+{value.newOutfits}</strong></div>
              <div><span>Duplicate risk</span><strong>{duplicate}%</strong></div>
            </div>

            <div className="purchase-summary">
              <div>
                <span className="retailer-pill">{suggestion.retailer}</span>
                <h4>{suggestion.name}</h4>
                <p>{suggestion.priceLabel} · {suggestion.colour}</p>
              </div>
              {value.costPerOutfit ? <strong>≈ €{value.costPerOutfit.toFixed(2)} / new outfit</strong> : null}
            </div>

            <p className="decision-explanation">{decision.copy}</p>
            <p className="decision-explanation">{suggestion.reason}</p>
            <div className="pairs-preview">
              <span>Already pairs with</span>
              {suggestion.pairsWith.slice(0, 3).map((id) => <small key={id}>{itemLabel(byId.get(id))}</small>)}
            </div>
            <a className="shop-link" href={suggestion.href} target="_blank" rel="noreferrer">View retailer product <span aria-hidden="true">↗</span></a>
            <small className="checked-at">Decision score is an MVP heuristic using wardrobe fit, duplicate risk, compatible pieces and current listed price.</small>
          </article>
        ) : null}
      </div>
    </section>
  );
}
